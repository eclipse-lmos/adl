// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.models.ConversationTurn
import org.eclipse.lmos.adl.server.models.TestExecutionResult
import org.eclipse.lmos.adl.server.models.RolePrompt
import org.eclipse.lmos.adl.server.models.SimpleMessage
import org.eclipse.lmos.adl.server.models.TestCase
import org.eclipse.lmos.adl.server.models.TestRunResult
import org.eclipse.lmos.adl.server.models.UserSettings
import org.eclipse.lmos.adl.server.models.Widget
import org.eclipse.lmos.adl.server.agents.EvalOutput
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationCommand
import org.eclipse.lmos.adl.server.repositories.SearchResult
import org.eclipse.lmos.adl.server.repositories.UseCaseEmbeddingsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAdlRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAgentRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryOrganizationRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryRolePromptRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryStatisticsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTagRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestCaseRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestRunRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryUserSettingsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryWidgetRepository
import org.eclipse.lmos.adl.server.services.OrganizationLifecycle
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class OrganizationLifecycleTest {
	@Test
	fun `delete organization purges owner scoped data and keeps public data`() = runBlocking {
		val organizationRepository = InMemoryOrganizationRepository()
		val adlRepository = InMemoryAdlRepository()
		val widgetRepository = InMemoryWidgetRepository()
		val testCaseRepository = InMemoryTestCaseRepository()
		val testRunRepository = InMemoryTestRunRepository()
		val agentRepository = InMemoryAgentRepository()
		val rolePromptRepository = InMemoryRolePromptRepository()
		val userSettingsRepository = InMemoryUserSettingsRepository()
		val statisticsRepository = InMemoryStatisticsRepository()
		val tagRepository = InMemoryTagRepository()
		val embeddingsRepository = RecordingEmbeddingsRepository()
		val lifecycle = OrganizationLifecycle(
			organizationRepository = organizationRepository,
			adlRepository = adlRepository,
			widgetRepository = widgetRepository,
			testCaseRepository = testCaseRepository,
			testRunRepository = testRunRepository,
			agentRepository = agentRepository,
			rolePromptRepository = rolePromptRepository,
			userSettingsRepository = userSettingsRepository,
			statisticsRepository = statisticsRepository,
			tagRepository = tagRepository,
			embeddingsRepository = embeddingsRepository,
		)

		val created = organizationRepository.create(
			CreateOrganizationCommand(
				id = "telekom-demo",
				name = "Telekom Demo",
				descriptions = "Demo organization",
				initialApiKeyLabel = "studio",
			),
		)
		assertNotNull(organizationRepository.resolveByApiKey(created.createdApiKey))

		withOwner(DEFAULT_OWNER) {
			widgetRepository.save(Widget(id = "public-widget", name = "Public", html = "<div/>", jsonSchema = "{}"))
		}

		withOwner("telekom-demo") {
			adlRepository.store(
				Adl(
					id = "demo-adl",
					content = "### UseCase: demo\n#### Solution\nDone\n----",
					tags = listOf("demo"),
					createdAt = "2026-03-14T12:00:00Z",
					examples = listOf("hello there"),
				),
			)
			widgetRepository.save(Widget(id = "org-widget", name = "Org Widget", html = "<div/>", jsonSchema = "{}"))
			testCaseRepository.save(
				TestCase(
					id = "org-test",
					adlId = "demo-adl",
					name = "Organization Test",
					description = "Checks purge",
					expectedConversation = listOf(ConversationTurn(role = "user", content = "hello")),
				),
			)
			testRunRepository.save(
				TestRunResult(
					id = "org-run",
					adlId = "demo-adl",
					createdAt = "2026-03-14T12:00:00Z",
					overallScore = 100.0,
					results = listOf(
						TestExecutionResult(
							testCaseId = "org-test",
							testCaseName = "Organization Test",
							status = "PASS",
							score = 100,
							testCase = TestCase(
								id = "org-test",
								adlId = "demo-adl",
								name = "Organization Test",
								description = "Checks purge",
								expectedConversation = listOf(ConversationTurn(role = "user", content = "hello")),
							),
							executedVariantIndex = 0,
							executedConversation = listOf(ConversationTurn(role = "user", content = "hello")),
							actualConversation = listOf(ConversationTurn(role = "user", content = "hello")),
							useCases = listOf("demo-adl"),
							details = EvalOutput(
								verdict = "pass",
								score = 100,
								reasons = emptyList(),
								missingRequirements = emptyList(),
								violations = emptyList(),
								evidence = emptyList(),
							),
						),
					),
				),
			)
			agentRepository.save(Agent(id = "org-agent", name = "Org Agent"))
			rolePromptRepository.save(
				RolePrompt(
					id = "org-role",
					name = "Org Role",
					description = "Role",
					tags = listOf("demo"),
					role = "Support",
					tone = "Friendly",
				),
			)
			userSettingsRepository.save(UserSettings(apiKey = "secret", modelName = "demo-model"))
			statisticsRepository.incrementUseCaseCount("demo")
			statisticsRepository.recordComplianceScore("demo", 95)
			statisticsRepository.recordResponseTime(java.time.Duration.ofMillis(250))
			tagRepository.saveAll(listOf("demo", "organization"))
			embeddingsRepository.storeUtterances("demo-adl", listOf("hello there"), setOf("demo"))
		}

		assertTrue(lifecycle.deleteOrganization("telekom-demo"))
		assertNull(organizationRepository.findById("telekom-demo"))
		assertNull(organizationRepository.resolveByApiKey(created.createdApiKey))

		withOwner("telekom-demo") {
			assertTrue(adlRepository.list().isEmpty())
			assertTrue(widgetRepository.findAll().isEmpty())
			assertTrue(testCaseRepository.findAll().isEmpty())
			assertTrue(testRunRepository.findByAdlId("demo-adl").isEmpty())
			assertTrue(agentRepository.findAll().isEmpty())
			assertTrue(rolePromptRepository.findAll().isEmpty())
			assertNull(userSettingsRepository.get())
			assertEquals(0.0, statisticsRepository.getAverageResponseTime())
			assertNull(statisticsRepository.getComplianceScores("demo"))
			assertTrue(tagRepository.list().isEmpty())
			assertEquals(0L, embeddingsRepository.count())
			assertTrue(embeddingsRepository.wasCleared)
		}

		withOwner(DEFAULT_OWNER) {
			assertFalse(widgetRepository.findAll().isEmpty())
		}
	}

	private class RecordingEmbeddingsRepository : UseCaseEmbeddingsRepository {
		private val ownerToUseCases = mutableMapOf<String, MutableSet<String>>()
		var wasCleared: Boolean = false
			private set

		override suspend fun initialize() = Unit

		override suspend fun storeUtterances(id: String, examples: List<String>, tags: Set<String>): Int {
			ownerToUseCases.computeIfAbsent(currentOwner()) { linkedSetOf() }.add(id)
			return examples.size
		}

		override suspend fun storeUseCase(adl: String, examples: List<String>, tags: Set<String>): Int = 0

		override suspend fun search(query: String, limit: Int, scoreThreshold: Float, tags: Set<String>?): List<SearchResult> = emptyList()

		override suspend fun searchByConversation(messages: List<SimpleMessage>, limit: Int, scoreThreshold: Float): List<SearchResult> = emptyList()

		override suspend fun deleteByUseCaseId(useCaseId: String) {
			ownerToUseCases[currentOwner()]?.remove(useCaseId)
		}

		override suspend fun clear() {
			wasCleared = true
			ownerToUseCases.remove(currentOwner())
		}

		override suspend fun count(): Long = ownerToUseCases[currentOwner()]?.size?.toLong() ?: 0L

		override fun close() = Unit
	}
}

