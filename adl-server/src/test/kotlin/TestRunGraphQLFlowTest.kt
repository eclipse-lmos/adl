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
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestRunRepository
import org.eclipse.lmos.adl.server.inbound.mutation.TestCreatorMutation
import org.eclipse.lmos.adl.server.inbound.query.TestRunQuery
import org.eclipse.lmos.adl.server.services.ConversationEvaluator
import org.eclipse.lmos.adl.server.services.TestExecutor
import org.eclipse.lmos.arc.agents.ConversationAgent
import org.eclipse.lmos.arc.agents.agent.Skill
import org.eclipse.lmos.arc.agents.conversation.AssistantMessage
import org.eclipse.lmos.arc.agents.conversation.Conversation
import org.eclipse.lmos.arc.core.Success
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class TestRunGraphQLFlowTest {
    @Test
    fun `execute list get and delete persisted test runs`() = runBlocking {
        val adlRepository = InMemoryAdlRepository()
        val testCaseRepository = InMemoryTestCaseRepository()
        val testRunRepository = InMemoryTestRunRepository()
        adlRepository.store(sampleAdl("adl-1"))
        testCaseRepository.save(
            TestCase(
                id = "test-1",
                useCaseId = "password_reset",
                adlId = "adl-1",
                name = "Happy path",
                description = "Happy path",
                expectedConversation = listOf(
                    ConversationTurn(role = "user", content = "I forgot my password"),
                    ConversationTurn(role = "assistant", content = "I can help you reset it."),
                ),
            )
        )

        val executor = TestExecutor(
            assistantAgent = SuccessfulConversationAgent(),
            adlStorage = adlRepository,
            testCaseRepository = testCaseRepository,
            conversationEvaluator = ConversationEvaluator(ConstantEmbeddingModel()),
        )
        val mutation = TestCreatorMutation(
            testCreatorAgent = SuccessfulConversationAgent(),
            testCaseRepository = testCaseRepository,
            testRunRepository = testRunRepository,
            testExecutor = executor,
            adlRepository = adlRepository,
            testVariantAgent = SuccessfulConversationAgent(),
        )
        val query = TestRunQuery(testRunRepository)

        val executed = mutation.executeTests(adlId = "adl-1", testCaseId = "test-1")
        val listed = query.testRuns(adlId = "adl-1", limit = 20)
        val loaded = query.testRun(executed.id)
        val deleted = mutation.deleteTestRun(executed.id)
        val afterDelete = query.testRun(executed.id)

        assertNotNull(executed.id)
        assertEquals(1, listed.size)
        assertEquals(executed.id, listed.first().id)
        assertEquals(executed.id, loaded?.id)
        assertFalse(executed.createdAt.isBlank())
        assertEquals("test-1", executed.requestedTestCaseId)
        assertEquals("Happy path", loaded?.results?.first()?.testCase?.name)
        assertEquals(true, deleted)
        assertNull(afterDelete)
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

private class SuccessfulConversationAgent : ConversationAgent {
    override val name: String = "successful-agent"
    override val version: String = "test"
    override val description: String = "Always returns a matching assistant message"

    override suspend fun fetchSkills(): List<Skill> = emptyList()

    override suspend fun execute(input: Conversation, context: Set<Any>) = Success(
        input.copy(transcript = input.transcript + AssistantMessage("I can help you reset it."))
    )
}

private class ConstantEmbeddingModel : EmbeddingModel {
    override fun embedAll(textSegments: List<TextSegment>): Response<List<Embedding>> {
        return Response.from(textSegments.map { Embedding.from(floatArrayOf(1f, 1f)) })
    }
}

