// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp

import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.GetPromptRequest
import kotlinx.serialization.json.JsonObject
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
                request.arguments?.get(paramName)?.takeIf { it.isNotBlank() } ?: defaultValue
            } catch (_: Exception) {
                defaultValue
            }
        }

        fun getOptionalStringArgument(request: CallToolRequest, paramName: String): String? {
            return when (val value = request.arguments?.get(paramName)) {
                is JsonPrimitive -> value.content
                else -> null
            }
        }

        fun getRequiredStringArgument(request: CallToolRequest, paramName: String): String? {
            return getOptionalStringArgument(request, paramName)?.trim()?.takeIf { it.isNotEmpty() }
        }

        fun getUnexpectedArgumentKeys(request: CallToolRequest, allowedKeys: Set<String>): Set<String> {
            val arguments: JsonObject = request.arguments ?: return emptySet()
            return arguments.keys - allowedKeys
        }
    }
}