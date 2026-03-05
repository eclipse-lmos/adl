package org.eclipse.lmos.adl.mcp

import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.GetPromptRequest
import kotlinx.serialization.json.JsonPrimitive

class Util {
    companion object {
        fun getRequestParameter(request: CallToolRequest, paramName: String, defaultValue: String = "unknown"): String {
            return try {
                when (val value = request.arguments?.get(paramName)) {
                    is JsonPrimitive -> value.content
                    else -> value?.toString() ?: defaultValue
                }
            } catch (_: Exception) {
                defaultValue
            }
        }

        fun getRequestParameter(request: GetPromptRequest, paramName: String, defaultValue: String = "unknown"): String {
            return try {
                when (val value = request.arguments?.get(paramName)) {
                    is JsonPrimitive -> value.content
                    else -> value?.toString() ?: "unknown"
                }
            } catch (_: Exception) {
                defaultValue
            }
        }
    }
}