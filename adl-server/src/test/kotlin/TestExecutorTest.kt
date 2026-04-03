// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server

import dev.langchain4j.data.embedding.Embedding
import dev.langchain4j.data.segment.TextSegment
import dev.langchain4j.model.embedding.EmbeddingModel
import dev.langchain4j.model.output.Response
import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.models.ConversationTurn
import org.eclipse.lmos.adl.server.models.TestCase
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAdlRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestCaseRepository
import org.eclipse.lmos.adl.server.services.ConversationEvaluator
import org.eclipse.lmos.adl.server.services.TestExecutor
import org.eclipse.lmos.arc.agents.ConversationAgent
import org.eclipse.lmos.arc.agents.AgentFailedException
import org.eclipse.lmos.arc.agents.agent.Skill
import org.eclipse.lmos.arc.agents.conversation.AssistantMessage
import org.eclipse.lmos.arc.agents.conversation.Conversation
import org.eclipse.lmos.arc.core.Failure
import org.eclipse.lmos.arc.core.Success
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class TestExecutorTest {
    @Test
    fun `execute tests stores executed variant and test case snapshot`() = runBlocking {
        val adlRepository = InMemoryAdlRepository()
        val testCaseRepository = InMemoryTestCaseRepository()
        adlRepository.store(sampleAdl("adl-1"))
        testCaseRepository.save(
            TestCase(
                id = "test-1",
                useCaseId = "password_reset",
                adlId = "adl-1",
                name = "Variant selection",
                description = "Uses the concrete variant that was executed",
                expectedConversation = listOf(
                    ConversationTurn(role = "user", content = "I forgot my password"),
                    ConversationTurn(role = "assistant", content = "I can help you reset it."),
                ),
                variants = listOf(
                    listOf(ConversationTurn(role = "user", content = "Need password help")),
                    listOf(ConversationTurn(role = "user", content = "I forgot my password")),
                ),
            )
        )
        val executor = TestExecutor(
            assistantAgent = FakeConversationAgent { input ->
                val latestUserMessage = input.transcript.last().content
                val answer = if (latestUserMessage.contains("Need password help")) {
                    "That was not the expected flow."
                } else {
                    "I can help you reset it."
                }
                Success(input.copy(transcript = input.transcript + AssistantMessage(answer)))
            },
            adlStorage = adlRepository,
            testCaseRepository = testCaseRepository,
            conversationEvaluator = ConversationEvaluator(FakeEmbeddingModel()),
        )

        val result = executor.executeTests(adlId = "adl-1")

        assertEquals("adl-1", result.adlId)
        assertEquals(1, result.results.size)
        assertEquals(0, result.results.first().executedVariantIndex)
        assertEquals("Need password help", result.results.first().executedConversation.first().content)
        assertEquals("Variant selection", result.results.first().testCase.name)
        assertNotNull(result.createdAt)
    }

    @Test
    fun `execute tests includes failure reason when agent execution fails`() = runBlocking {
        val adlRepository = InMemoryAdlRepository()
        val testCaseRepository = InMemoryTestCaseRepository()
        adlRepository.store(sampleAdl("adl-1"))
        testCaseRepository.save(
            TestCase(
                id = "test-2",
                useCaseId = "password_reset",
                adlId = "adl-1",
                name = "Failure propagation",
                description = "Propagates agent failures into stored results",
                expectedConversation = listOf(
                    ConversationTurn(role = "user", content = "I forgot my password"),
                    ConversationTurn(role = "assistant", content = "I can help you reset it."),
                ),
            )
        )
        val executor = TestExecutor(
            assistantAgent = FakeConversationAgent { _ -> Failure(AgentFailedException("timeout")) },
            adlStorage = adlRepository,
            testCaseRepository = testCaseRepository,
            conversationEvaluator = ConversationEvaluator(FakeEmbeddingModel()),
        )

        val result = executor.executeTests(adlId = "adl-1", testCaseId = "test-2")

        assertEquals("test-2", result.requestedTestCaseId)
        assertEquals("FAIL", result.results.first().status)
        assertTrue(result.results.first().failureReason?.contains("timeout") == true)
        assertTrue(result.results.first().details.reasons.any { it.contains("timeout") })
    }

    private fun sampleAdl(id: String) = Adl(
        id = id,
        createdAt = "2026-03-14T12:00:00Z",
        content = """
            ### UseCase: password_reset
            #### Description
            Help the user reset their password.
            #### Solution
            Guide the user through the reset flow.
            ----
        """.trimIndent(),
        tags = listOf("auth"),
    )
}

private class FakeConversationAgent(
    private val handler: suspend (Conversation) -> org.eclipse.lmos.arc.core.Result<Conversation, org.eclipse.lmos.arc.agents.AgentFailedException>,
) : ConversationAgent {
    override val name: String = "fake-conversation-agent"
    override val version: String = "test"
    override val description: String = "Test double for conversation execution"

    override suspend fun fetchSkills(): List<Skill> = emptyList()

    override suspend fun execute(
        input: Conversation,
        context: Set<Any>,
    ) = handler(input)
}

private class FakeEmbeddingModel : EmbeddingModel {
    override fun embedAll(textSegments: List<TextSegment>): Response<List<Embedding>> {
        val embeddings = textSegments.map { segment ->
            val length = segment.text().length.toFloat().coerceAtLeast(1f)
            Embedding.from(floatArrayOf(length, length + 1f))
        }
        return Response.from(embeddings)
    }
}

