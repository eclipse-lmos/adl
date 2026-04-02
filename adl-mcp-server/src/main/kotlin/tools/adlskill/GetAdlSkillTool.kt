// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.Tool
import io.modelcontextprotocol.kotlin.sdk.types.ToolAnnotations
import io.modelcontextprotocol.kotlin.sdk.types.ToolSchema
import io.modelcontextprotocol.kotlin.sdk.types.error
import io.modelcontextprotocol.kotlin.sdk.types.success
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import org.eclipse.lmos.adl.mcp.Util

class GetAdlSkillTool(
    private val lookupService: AdlLookupService = AdlLookupService(),
) {
    fun toolDefinition(): Tool {
        return Tool(
            name = TOOL_NAME,
            description = TOOL_DESCRIPTION,
            inputSchema = ToolSchema(
                properties = buildJsonObject {
                    putJsonObject(USER_QUERY_PARAM) {
                        put("type", "string")
                        put("description", USER_QUERY_DESCRIPTION)
                    }
                },
                required = listOf(USER_QUERY_PARAM),
            ),
            annotations = ToolAnnotations(
                title = "Get ADL Skill",
                readOnlyHint = true,
                destructiveHint = false,
                idempotentHint = true,
                openWorldHint = true,
            ),
        )
    }

    suspend fun handle(request: CallToolRequest): CallToolResult {
        val unexpectedArguments = Util.getUnexpectedArgumentKeys(request, setOf(USER_QUERY_PARAM))
        if (unexpectedArguments.isNotEmpty()) {
            return CallToolResult.error(
                "Validation error: unsupported arguments provided: ${unexpectedArguments.sorted().joinToString(", ")}.",
            )
        }

        val userQuery = Util.getRequiredStringArgument(request, USER_QUERY_PARAM)
            ?: return CallToolResult.error("Validation error: user_query must be a non-empty string.")

        return when (val outcome = lookupService.lookup(userQuery)) {
            is AdlLookupOutcome.MatchFound -> CallToolResult.success(outcome.content)
            AdlLookupOutcome.NoMatch -> CallToolResult.success("No relevant ADL found for query: $userQuery")
            is AdlLookupOutcome.Failure -> CallToolResult.error(outcome.publicMessage)
        }
    }

    companion object {
        const val TOOL_NAME = "get_adl_skill"
        const val USER_QUERY_PARAM = "user_query"

        private const val TOOL_DESCRIPTION =
            "Searches the configured ADL server for the most relevant ADL and returns the top match content."
        private const val USER_QUERY_DESCRIPTION =
            "A non-empty natural-language query used to find the most relevant ADL content."
    }
}