package org.eclipse.lmos.arc.mcp.tools

import io.modelcontextprotocol.kotlin.sdk.server.RegisteredTool
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.modelcontextprotocol.kotlin.sdk.types.Tool
import io.modelcontextprotocol.kotlin.sdk.types.ToolSchema
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.eclipse.lmos.arc.mcp.Util
import org.eclipse.lmos.arc.mcp.SystemPromptMutation
import org.eclipse.lmos.arc.mcp.SystemPromptResult
import org.eclipse.lmos.arc.mcp.sessions.InMemorySessions
import org.eclipse.lmos.arc.mcp.tools.systemprompt.templates.TemplateLoader

class SystemPromptTool {
    private val sessions = InMemorySessions()
    private val templateLoader = TemplateLoader()

    companion object {
        private const val TOOL_DESCRIPTION = "Retrieves a system prompt tailored for a specific use case. The tool obtains a generic system prompt from a designated source, embeds the provided useCase into it, and refines the prompt to make it more specific and relevant. The resulting, customized system prompt is then returned to the MCP client for use in downstream tasks or agent interactions."
        private const val USE_CASE_PARAM = "useCase"
        private const val USE_CASE_PARAM_DESCRIPTION = "A markdown-formatted description provided by the client, representing the context or requirements for the prompt."
        private const val SESSION_ID_PARAM = "sessionId"
        private const val SESSION_ID_PARAM_DESCRIPTION = "Session identifier"
    }

    private fun createTool(): Tool {
        return Tool(
            name = "get-system-prompt",
            description = TOOL_DESCRIPTION,
            inputSchema = ToolSchema(
                properties = buildJsonObject {
                    put(USE_CASE_PARAM, buildJsonObject {
                        put("type", "string")
                        put("description", USE_CASE_PARAM_DESCRIPTION)
                    })
                    put(SESSION_ID_PARAM, buildJsonObject {
                        put("type", "string")
                        put("description", SESSION_ID_PARAM_DESCRIPTION)
                    })
                },
                required = listOf(USE_CASE_PARAM, SESSION_ID_PARAM),
            ),
        )
    }


    private fun createHandler(): suspend (CallToolRequest) -> CallToolResult = { request ->
        val useCase = Util.Companion.getRequestParameter(request, USE_CASE_PARAM)
        val sessionId = Util.Companion.getRequestParameter(request, SESSION_ID_PARAM)
        val systemPromptMutation = SystemPromptMutation(sessions, templateLoader)
        val systemPrompt : SystemPromptResult = systemPromptMutation.systemPrompt(useCase, sessionId = sessionId)

        CallToolResult(
            content = listOf(TextContent(Json.Default.encodeToString(systemPrompt))),
            isError = false
        )
    }

    fun createAdlSystemPromptTool(): RegisteredTool {
        val tool = createTool()
        val handler = createHandler()
        return RegisteredTool(tool, handler)
    }
}