// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

data class AdlServerConfig(
    val endpoint: String,
    val timeoutMillis: Long,
) {
    companion object {
        const val ENDPOINT_ENV = "ADL_SERVER_GRAPHQL_ENDPOINT"
        const val TIMEOUT_MILLIS_ENV = "ADL_SERVER_GRAPHQL_TIMEOUT_MILLIS"
        private const val DEFAULT_TIMEOUT_MILLIS = 2000L

        fun fromEnvironment(environment: Map<String, String> = System.getenv()): AdlServerConfig? {
            val endpoint = environment[ENDPOINT_ENV]?.trim()?.takeIf { it.isNotEmpty() } ?: return null
            val timeoutMillis = environment[TIMEOUT_MILLIS_ENV]
                ?.toLongOrNull()
                ?.takeIf { it > 0 }
                ?: DEFAULT_TIMEOUT_MILLIS

            return AdlServerConfig(endpoint = endpoint, timeoutMillis = timeoutMillis)
        }
    }
}