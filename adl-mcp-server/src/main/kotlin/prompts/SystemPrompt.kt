// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.prompts

import io.modelcontextprotocol.kotlin.sdk.server.RegisteredPrompt
import io.modelcontextprotocol.kotlin.sdk.types.GetPromptRequest
import io.modelcontextprotocol.kotlin.sdk.types.GetPromptResult
import io.modelcontextprotocol.kotlin.sdk.types.Prompt
import io.modelcontextprotocol.kotlin.sdk.types.PromptArgument
import io.modelcontextprotocol.kotlin.sdk.types.PromptMessage
import io.modelcontextprotocol.kotlin.sdk.types.Role
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import kotlinx.serialization.json.Json
import org.eclipse.lmos.adl.mcp.Util
import org.eclipse.lmos.adl.mcp.SystemPromptMutation
import org.eclipse.lmos.adl.mcp.SystemPromptResult
import org.eclipse.lmos.adl.mcp.sessions.InMemorySessions
import org.eclipse.lmos.adl.mcp.tools.systemprompt.templates.TemplateLoader

class SystemPrompt {
    private val sessions = InMemorySessions()
    private val templateLoader = TemplateLoader()

    companion object {
        private const val PROMPT_DESCRIPTION = "Retrieves a system prompt tailored for a specific use case. The tool obtains a generic system prompt from a designated source, embeds the provided useCase into it, and refines the prompt to make it more specific and relevant. The resulting, customized system prompt is then returned to the MCP client for use in downstream tasks or agent interactions."
        private const val USE_CASE_PARAM = "useCase"
        private const val USE_CASE_PARAM_DESCRIPTION = "A markdown-formatted description provided by the client, representing the context or requirements for the prompt."
        private const val SESSION_ID_PARAM = "sessionId"
        private const val SESSION_ID_PARAM_DESCRIPTION = "Session identifier"
    }

    fun createSystemPrompt(): RegisteredPrompt {
        val prompt = Prompt(
            name = "get-system-prompt",
            description = PROMPT_DESCRIPTION,
            arguments = listOf(
                PromptArgument(
                    name = USE_CASE_PARAM,
                    description = USE_CASE_PARAM_DESCRIPTION,
                    required = true,
                ),
                PromptArgument(
                    name = SESSION_ID_PARAM,
                    description = SESSION_ID_PARAM_DESCRIPTION,
                    required = false,
                ),
            ),
        )

        val promptProvider: suspend (GetPromptRequest) -> GetPromptResult = { request ->
            val useCase = Util.Companion.getRequestParameter(request, USE_CASE_PARAM)
            val sessionId = Util.Companion.getRequestParameter(request, SESSION_ID_PARAM)
            val systemPromptMutation = SystemPromptMutation(sessions, templateLoader)
            val systemPrompt : SystemPromptResult = systemPromptMutation.systemPrompt(useCase, sessionId = sessionId)

            GetPromptResult(
                messages = listOf(
                    PromptMessage(
                        role = Role.User,
                        content = TextContent(
                            Json.Default.encodeToString(systemPrompt)
                        ),
                    ),
                ),
                description = "Description for ${request.name}",
            )
        }

        return RegisteredPrompt(prompt, promptProvider)
    }

}