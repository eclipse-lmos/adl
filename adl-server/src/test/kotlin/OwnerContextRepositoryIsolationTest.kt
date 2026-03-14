// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.agents.EvalOutput
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.models.ConversationTurn
import org.eclipse.lmos.adl.server.models.RolePrompt
import org.eclipse.lmos.adl.server.models.TestCase
import org.eclipse.lmos.adl.server.models.TestExecutionResult
import org.eclipse.lmos.adl.server.models.TestRunResult
import org.eclipse.lmos.adl.server.models.UserSettings
import org.eclipse.lmos.adl.server.models.Widget
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAdlRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAgentRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryRolePromptRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTagRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestCaseRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestRunRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryUserSettingsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryWidgetRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class OwnerContextRepositoryIsolationTest {

    @Test
    fun `current owner defaults to public and coroutine owner is restored after block`() = runBlocking {
        assertEquals(DEFAULT_OWNER, currentOwner())

        withOwner("alice") {
            assertEquals("alice", currentOwner())
        }

        assertEquals(DEFAULT_OWNER, currentOwner())
    }

    @Test
    fun `widget repository isolates data by owner from context`() {
        val repository = InMemoryWidgetRepository()

        val publicWidget = repository.save(sampleWidget(id = "shared-id", name = "Public"))
        val aliceWidget = withOwnerBlocking("alice") {
            repository.save(sampleWidget(id = "shared-id", name = "Alice"))
        }

        assertEquals(DEFAULT_OWNER, publicWidget.owner)
        assertEquals("alice", aliceWidget.owner)
        assertEquals("Public", repository.findById("shared-id")?.name)
        assertEquals("Alice", withOwnerBlocking("alice") { repository.findById("shared-id")?.name })
    }

    @Test
    fun `suspend repositories isolate data by owner from coroutine context`() = runBlocking {
        val adlRepository = InMemoryAdlRepository()
        val userSettingsRepository = InMemoryUserSettingsRepository()

        adlRepository.store(sampleAdl(id = "adl-1", content = "public"))
        userSettingsRepository.save(UserSettings(apiKey = "public-key", modelName = "gpt-4.1"))

        withOwner("alice") {
            adlRepository.store(sampleAdl(id = "adl-1", content = "alice"))
            userSettingsRepository.save(UserSettings(apiKey = "alice-key", modelName = "gpt-4.1-mini"))

            assertEquals("alice", adlRepository.get("adl-1")?.content)
            assertEquals("alice-key", userSettingsRepository.get()?.apiKey)
        }

        assertEquals("public", adlRepository.get("adl-1")?.content)
        assertEquals("public-key", userSettingsRepository.get()?.apiKey)
        assertNull(withOwnerBlocking("bob") { null })
    }

    @Test
    fun `owner scoped repositories isolate agents prompts test cases and tags`() = runBlocking {
        val agentRepository = InMemoryAgentRepository()
        val rolePromptRepository = InMemoryRolePromptRepository()
        val testCaseRepository = InMemoryTestCaseRepository()
        val testRunRepository = InMemoryTestRunRepository()
        val tagRepository = InMemoryTagRepository()

        agentRepository.save(Agent(id = "agent-1", name = "Public Agent"))
        rolePromptRepository.save(RolePrompt(id = "prompt-1", name = "Public Prompt", description = "", tags = listOf("public"), role = "role", tone = "tone"))
        testCaseRepository.save(sampleTestCase(id = "case-1", name = "Public Test"))
        testRunRepository.save(sampleTestRun(id = "run-1", owner = DEFAULT_OWNER))
        tagRepository.saveAll(listOf("public-tag", "shared-tag"))

        withOwner("alice") {
            agentRepository.save(Agent(id = "agent-1", name = "Alice Agent"))
            rolePromptRepository.save(RolePrompt(id = "prompt-1", name = "Alice Prompt", description = "", tags = listOf("alice"), role = "role", tone = "tone"))
            testCaseRepository.save(sampleTestCase(id = "case-1", name = "Alice Test"))
            testRunRepository.save(sampleTestRun(id = "run-1", owner = "alice"))
            tagRepository.saveAll(listOf("alice-tag", "shared-tag"))

            assertEquals("Alice Agent", agentRepository.findById("agent-1")?.name)
            assertEquals("Alice Prompt", rolePromptRepository.findById("prompt-1")?.name)
            assertEquals("Alice Test", testCaseRepository.findById("case-1")?.name)
            assertEquals("alice", testRunRepository.findById("run-1")?.owner)
            assertTrue(tagRepository.list().containsAll(listOf("alice-tag", "shared-tag")))
        }

        assertEquals("Public Agent", agentRepository.findById("agent-1")?.name)
        assertEquals("Public Prompt", rolePromptRepository.findById("prompt-1")?.name)
        assertEquals("Public Test", testCaseRepository.findById("case-1")?.name)
        assertEquals(DEFAULT_OWNER, testRunRepository.findById("run-1")?.owner)
        assertTrue(tagRepository.list().containsAll(listOf("public-tag", "shared-tag")))
    }

    private fun sampleWidget(id: String, name: String) = Widget(
        id = id,
        name = name,
        description = "Sample widget",
        html = "<div>Hello</div>",
        jsonSchema = "{\"type\":\"object\"}",
        preview = "preview-data",
    )

    private fun sampleAdl(id: String, content: String) = Adl(
        id = id,
        content = content,
        tags = listOf("tag"),
        createdAt = "2024-01-01T00:00:00Z",
    )

    private fun sampleTestCase(id: String, name: String) = TestCase(
        id = id,
        useCaseId = "adl-1",
        adlId = "adl-1",
        name = name,
        description = "Sample test case",
        expectedConversation = listOf(ConversationTurn(role = "user", content = "Hello")),
    )

    private fun sampleTestRun(id: String, owner: String) = TestRunResult(
        id = id,
        adlId = "adl-1",
        owner = owner,
        createdAt = "2026-03-14T12:00:00Z",
        overallScore = 100.0,
        results = listOf(
            TestExecutionResult(
                testCaseId = "case-1",
                testCaseName = "Sample Test",
                status = "PASS",
                score = 100,
                testCase = sampleTestCase(id = "case-1", name = "Sample Test").copy(owner = owner),
                executedVariantIndex = 0,
                executedConversation = listOf(ConversationTurn(role = "user", content = "Hello")),
                actualConversation = listOf(
                    ConversationTurn(role = "user", content = "Hello"),
                    ConversationTurn(role = "assistant", content = "Hi")
                ),
                useCases = listOf("adl-1"),
                details = EvalOutput(
                    verdict = "pass",
                    score = 100,
                    reasons = emptyList(),
                    missingRequirements = emptyList(),
                    violations = emptyList(),
                    evidence = emptyList(),
                ),
            )
        ),
    )
}

