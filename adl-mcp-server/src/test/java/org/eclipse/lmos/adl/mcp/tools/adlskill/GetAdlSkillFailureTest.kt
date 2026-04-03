// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequestParams
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class GetAdlSkillFailureTest {
    @Test
    fun `rejects blank user_query input`() = runBlocking {
        val result = GetAdlSkillTool(mockk()).handle(
            requestWithArguments(buildJsonObject { put(GetAdlSkillTool.USER_QUERY_PARAM, "   ") }),
        )

        assertThat(result.isError).isTrue()
        assertThat(result.singleText()).isEqualTo("Validation error: user_query must be a non-empty string.")
    }

    @Test
    fun `rejects unsupported endpoint override input`() = runBlocking {
        val result = GetAdlSkillTool(mockk()).handle(
            requestWithArguments(
                buildJsonObject {
                    put(GetAdlSkillTool.USER_QUERY_PARAM, "How to implement auth?")
                    put("endpoint", "http://localhost:9999/graphql")
                },
            ),
        )

        assertThat(result.isError).isTrue()
        assertThat(result.singleText()).contains("unsupported arguments")
        assertThat(result.singleText()).contains("endpoint")
    }

    @Test
    fun `returns sanitized error message when lookup service fails`() = runBlocking {
        val lookupService = mockk<AdlLookupService>()
        coEvery { lookupService.lookup("How to implement auth?") } returns AdlLookupOutcome.Failure(
            kind = AdlLookupFailureKind.Dependency,
            publicMessage = "ADL server request failed.",
        )

        val result = GetAdlSkillTool(lookupService).handle(validRequest())

        assertThat(result.isError).isTrue()
        assertThat(result.singleText()).isEqualTo("ADL server request failed.")
        assertThat(result.singleText()).doesNotContain("Exception")
        assertThat(result.singleText()).doesNotContain("token")
    }

    @Test
    fun `returns sanitized invalid-response message for GraphQL errors`() = runBlocking {
        val client = mockk<AdlGraphQlClient>()
        coEvery { client.searchByText(any(), any()) } throws InvalidAdlServerResponseException("token=secret")

        val outcome = AdlLookupService(
            configProvider = { AdlServerConfig(endpoint = "http://example.test/graphql", timeoutMillis = 2_000) },
            graphQlClient = client,
        ).lookup("How to implement auth?")

        assertThat(outcome).isEqualTo(
            AdlLookupOutcome.Failure(
                kind = AdlLookupFailureKind.InvalidResponse,
                publicMessage = "ADL server returned an invalid response.",
            ),
        )
    }

    @Test
    fun `returns sanitized invalid-response message when top match content is blank`() = runBlocking {
        val client = mockk<AdlGraphQlClient>()
        coEvery { client.searchByText(any(), any()) } returns listOf(
            UseCaseMatchPayload(
                useCaseId = "auth-001",
                content = "   ",
                maxScore = 0.42,
                matchedExamples = emptyList(),
            ),
        )

        val outcome = AdlLookupService(
            configProvider = { AdlServerConfig(endpoint = "http://example.test/graphql", timeoutMillis = 2_000) },
            graphQlClient = client,
        ).lookup("How to implement auth?")

        assertThat(outcome).isEqualTo(
            AdlLookupOutcome.Failure(
                kind = AdlLookupFailureKind.InvalidResponse,
                publicMessage = "ADL server returned an invalid response.",
            ),
        )
    }

    private fun validRequest(): CallToolRequest {
        return requestWithArguments(
            buildJsonObject {
                put(GetAdlSkillTool.USER_QUERY_PARAM, "How to implement auth?")
            },
        )
    }

    private fun requestWithArguments(arguments: kotlinx.serialization.json.JsonObject): CallToolRequest {
        return CallToolRequest(CallToolRequestParams(name = GetAdlSkillTool.TOOL_NAME, arguments = arguments))
    }

    private fun CallToolResult.singleText(): String = (content.single() as TextContent).text
}