// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

import io.ktor.client.plugins.HttpRequestTimeoutException
import kotlinx.io.IOException

class AdlLookupService(
    private val configProvider: () -> AdlServerConfig? = { AdlServerConfig.fromEnvironment() },
    private val graphQlClient: AdlGraphQlClient = AdlGraphQlClient(),
) {
    suspend fun lookup(userQuery: String): AdlLookupOutcome {
        val config = configProvider()
            ?: return AdlLookupOutcome.Failure(
                kind = AdlLookupFailureKind.Dependency,
                publicMessage = "ADL server is not configured.",
            )

        return try {
            val matches = graphQlClient.searchByText(config, userQuery)
            val topMatch = matches.firstOrNull() ?: return AdlLookupOutcome.NoMatch

            if (topMatch.content.isBlank()) {
                AdlLookupOutcome.Failure(
                    kind = AdlLookupFailureKind.InvalidResponse,
                    publicMessage = "ADL server returned an invalid response.",
                )
            } else {
                AdlLookupOutcome.MatchFound(content = topMatch.content)
            }
        } catch (_: HttpRequestTimeoutException) {
            AdlLookupOutcome.Failure(
                kind = AdlLookupFailureKind.Dependency,
                publicMessage = "ADL server request timed out.",
            )
        } catch (_: IOException) {
            AdlLookupOutcome.Failure(
                kind = AdlLookupFailureKind.Dependency,
                publicMessage = "ADL server is unavailable.",
            )
        } catch (_: InvalidAdlServerResponseException) {
            AdlLookupOutcome.Failure(
                kind = AdlLookupFailureKind.InvalidResponse,
                publicMessage = "ADL server returned an invalid response.",
            )
        } catch (_: Exception) {
            AdlLookupOutcome.Failure(
                kind = AdlLookupFailureKind.Dependency,
                publicMessage = "ADL server request failed.",
            )
        }
    }
}

sealed interface AdlLookupOutcome {
    data class MatchFound(val content: String) : AdlLookupOutcome
    data object NoMatch : AdlLookupOutcome
    data class Failure(
        val kind: AdlLookupFailureKind,
        val publicMessage: String,
    ) : AdlLookupOutcome
}

enum class AdlLookupFailureKind {
    Dependency,
    InvalidResponse,
}