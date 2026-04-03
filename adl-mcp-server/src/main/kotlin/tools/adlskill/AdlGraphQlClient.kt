// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.HttpRequestTimeoutException
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.statement.bodyAsText
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerializationException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

class AdlGraphQlClient(
    private val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    },
    private val httpClientFactory: (AdlServerConfig) -> HttpClient = { config ->
        HttpClient(CIO) {
            install(HttpTimeout) {
                requestTimeoutMillis = config.timeoutMillis
                connectTimeoutMillis = config.timeoutMillis
                socketTimeoutMillis = config.timeoutMillis
            }
            defaultRequest {
                contentType(ContentType.Application.Json)
            }
        }
    },
) {
    suspend fun searchByText(
        config: AdlServerConfig,
        userQuery: String,
    ): List<UseCaseMatchPayload> {
        val client = httpClientFactory(config)

        return try {
            val responseBody = client.post(config.endpoint) {
                setBody(
                    json.encodeToString(
                        AdlSearchRequest(
                            query = SEARCH_BY_TEXT_QUERY,
                            variables = AdlSearchVariables(query = userQuery),
                        ),
                    ),
                )
            }.bodyAsText()

            val envelope = json.decodeFromString<GraphQlEnvelope<SearchByTextData>>(responseBody)

            if (!envelope.errors.isNullOrEmpty()) {
                throw InvalidAdlServerResponseException("ADL server returned GraphQL errors")
            }

            envelope.data?.searchByText
                ?: throw InvalidAdlServerResponseException("ADL server returned an invalid GraphQL payload")
        } catch (exception: SerializationException) {
            throw InvalidAdlServerResponseException("ADL server returned an unreadable GraphQL payload", exception)
        } finally {
            client.close()
        }
    }

    companion object {
        private const val SEARCH_BY_TEXT_QUERY =
            "query SearchByText(\$query: String!) { searchByText(query: \$query) { useCaseId content maxScore matchedExamples { score example } } }"
    }
}

class InvalidAdlServerResponseException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)