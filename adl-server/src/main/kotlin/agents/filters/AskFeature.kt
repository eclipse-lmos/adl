// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.agents.filters

import org.eclipse.lmos.arc.agents.conversation.ConversationMessage
import org.eclipse.lmos.arc.agents.dsl.AgentOutputFilter
import org.eclipse.lmos.arc.agents.dsl.OutputFilterContext
import org.eclipse.lmos.arc.agents.dsl.extensions.getCurrentUseCases
import org.eclipse.lmos.arc.agents.retry
import org.slf4j.LoggerFactory

/**
 * An [AgentOutputFilter] that verifies if the instructions contains the ASK keyword that the Agent generated a question.
 */
class AskFeature(private val keyword: String = "ASK", private val retryMax: Int = 1) : AgentOutputFilter {

    private val log = LoggerFactory.getLogger(this::class.java)

    override suspend fun filter(
        message: ConversationMessage,
        context: OutputFilterContext
    ): ConversationMessage {
        if (message.content.contains("?")) return message

        val useCaseId = context.getCurrentUseCases()?.currentUseCaseId ?: return message
        val processedUseCasesText = context.getCurrentUseCases()?.processedUseCaseMap?.get(useCaseId) ?: return message

        val askInstructions = processedUseCasesText
            .substringAfter("## Solution", "") // Get text after "## Solution"
            .split(Regex("(?<=[.!?])\\s+")) // Split into sentences
            .filter { it.contains(Regex("\\b$keyword\\b")) } // Match whole word "MUST"
            .map { it.trim() }

        if (askInstructions.isEmpty()) return message

        log.info("Agent instructed to ask a question. Retrying...")
        context.retry("FAILED_TO_FOLLOW_ASK_COMMAND", max = retryMax)

        return message
    }
}
