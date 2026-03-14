// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.services

import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.withOwner
import org.eclipse.lmos.adl.server.repositories.AdlRepository
import org.eclipse.lmos.adl.server.repositories.AgentRepository
import org.eclipse.lmos.adl.server.repositories.OrganizationRepository
import org.eclipse.lmos.adl.server.repositories.RolePromptRepository
import org.eclipse.lmos.adl.server.repositories.StatisticsRepository
import org.eclipse.lmos.adl.server.repositories.TagRepository
import org.eclipse.lmos.adl.server.repositories.TestCaseRepository
import org.eclipse.lmos.adl.server.repositories.TestRunRepository
import org.eclipse.lmos.adl.server.repositories.UseCaseEmbeddingsRepository
import org.eclipse.lmos.adl.server.repositories.UserSettingsRepository
import org.eclipse.lmos.adl.server.repositories.WidgetRepository

/**
 * Coordinates destructive lifecycle operations for organizations and their owner-scoped data.
 */
class OrganizationLifecycle(
    private val organizationRepository: OrganizationRepository,
    private val adlRepository: AdlRepository,
    private val widgetRepository: WidgetRepository,
    private val testCaseRepository: TestCaseRepository,
    private val testRunRepository: TestRunRepository,
    private val agentRepository: AgentRepository,
    private val rolePromptRepository: RolePromptRepository,
    private val userSettingsRepository: UserSettingsRepository,
    private val statisticsRepository: StatisticsRepository,
    private val tagRepository: TagRepository,
    private val embeddingsRepository: UseCaseEmbeddingsRepository,
) {
    /**
     * Deletes the organization [id] and purges all owner-scoped data that belongs to it.
     */
    suspend fun deleteOrganization(id: String): Boolean {
        require(id != DEFAULT_OWNER) { "The public organization cannot be deleted." }
        organizationRepository.findById(id) ?: throw NoSuchElementException("Organization with id $id not found.")

        withOwner(id) {
            adlRepository.list().forEach { adl ->
                testRunRepository.deleteByAdlId(adl.id)
                adlRepository.deleteById(adl.id)
            }
            widgetRepository.findAll().forEach { widget ->
                widgetRepository.delete(widget.id)
            }
            testCaseRepository.findAll().forEach { testCase ->
                testCaseRepository.delete(testCase.id)
            }
            agentRepository.findAll().forEach { agent ->
                agentRepository.delete(agent.id)
            }
            rolePromptRepository.findAll().forEach { rolePrompt ->
                rolePromptRepository.delete(rolePrompt.id)
            }
            tagRepository.list().forEach { tag ->
                tagRepository.delete(tag)
            }
            userSettingsRepository.delete()
            statisticsRepository.clear()
            embeddingsRepository.clear()
        }

        return organizationRepository.delete(id)
    }
}

