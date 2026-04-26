// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.inbound.rest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import org.eclipse.lmos.adl.server.OrganizationSessionCookieManager
import org.eclipse.lmos.adl.server.OwnerAccessResolver
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryOrganizationRepository
import org.eclipse.lmos.arc.agents.ConversationAgent
import org.eclipse.lmos.arc.agents.agent.Skill
import org.eclipse.lmos.arc.agents.conversation.AssistantMessage
import org.eclipse.lmos.arc.agents.conversation.Conversation
import org.eclipse.lmos.arc.api.AgentRequest
import org.eclipse.lmos.arc.api.SystemContextEntry
import org.eclipse.lmos.arc.core.Success
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies OpenAI completions request handling and header propagation into ARC system context.
 */
class OpenAICompletionsHandlerTest {
    @Test
    fun `post forwards x headers into agent request system context`() {
        testApplication {
            val assistantAgent = CapturingConversationAgent()

            application {
                routing {
                    openAICompletions(
                        assistantAgent = assistantAgent,
                        ownerAccessResolver = ownerAccessResolver(),
                    )
                }
            }

            val response = client.post("/v1/chat/completions") {
                header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
                header("X-Conversation-Id", "conversation-123")
                header("x-trace-id", "trace-abc")
                header("X-Feature-Flag", "beta")
                setBody(
                    """
                    {
                      "model": "test-model",
                      "messages": [
                        {"role": "user", "content": "Hello"}
                      ]
                    }
                    """.trimIndent(),
                )
            }

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals("conversation-123", response.headers["X-Conversation-Id"])

            val capturedRequest = requireNotNull(assistantAgent.capturedAgentRequest)
            assertEquals("conversation-123", capturedRequest.conversationContext.conversationId)
            assertEquals(
                setOf(
                    SystemContextEntry(key = "Conversation-Id", value = "conversation-123"),
                    SystemContextEntry(key = "trace-id", value = "trace-abc"),
                    SystemContextEntry(key = "Feature-Flag", value = "beta"),
                ),
                capturedRequest.systemContext.toSet(),
            )
        }
    }

    @Test
    fun `toSystemContextEntries preserves repeated x header values and ignores non x headers`() {
        val systemContext = headersOf(
            "X-Tag" to listOf("one", "two"),
            "Authorization" to listOf("ignored"),
        ).toSystemContextEntries()

        val tagValues = systemContext
            .filter { it.key == "Tag" }
            .map { it.value }

        assertEquals(listOf("one", "two"), tagValues)
        assertTrue(systemContext.none { it.key == "Authorization" })
    }

    private fun ownerAccessResolver(): OwnerAccessResolver = OwnerAccessResolver(
        organizationRepository = InMemoryOrganizationRepository(),
        organizationSessionCookieManager = OrganizationSessionCookieManager(secret = "test-secret"),
    )
}

/**
 * Test double that captures the ARC agent request context passed by the REST handler.
 */
private class CapturingConversationAgent : ConversationAgent {
    override val name: String = "capturing-conversation-agent"
    override val version: String = "test"
    override val description: String = "Captures AgentRequest instances for assertions"

    var capturedAgentRequest: AgentRequest? = null
        private set

    override suspend fun fetchSkills(): List<Skill> = emptyList()

    override suspend fun execute(input: Conversation, context: Set<Any>) = Success(
        input.copy(transcript = input.transcript + AssistantMessage("Captured response"))
    ).also {
        capturedAgentRequest = context.filterIsInstance<AgentRequest>().singleOrNull()
    }
}

