// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

import io.ktor.http.ContentType
import io.ktor.server.application.call
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer
import io.ktor.server.response.respondText
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequestParams
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.mockk.coEvery
import io.mockk.mockk
import java.net.ServerSocket
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class GetAdlSkillNoMatchTest {
    @Test
    fun `returns no-result message when lookup service reports no match`() = runBlocking {
        val lookupService = mockk<AdlLookupService>()
        coEvery { lookupService.lookup("How to implement auth?") } returns AdlLookupOutcome.NoMatch

        val result = GetAdlSkillTool(lookupService).handle(successRequest())

        assertThat(result.isError).isFalse()
        assertThat(result.singleText()).isEqualTo("No relevant ADL found for query: How to implement auth?")
    }

    @Test
    fun `returns no-result message when the ADL server returns an empty search result`() = runBlocking {
        val port = reservePort()
        val server = embeddedServer(CIO, host = "127.0.0.1", port = port) {
            routing {
                post("/") {
                    call.respondText(
                        AdlGraphQlFixtureSupport.readFixture("search-by-text-empty.json"),
                        ContentType.Application.Json,
                    )
                }
            }
        }.start(wait = false)

        try {
            val config = AdlServerConfig(endpoint = "http://127.0.0.1:$port/", timeoutMillis = 2_000)
            val result = GetAdlSkillTool(AdlLookupService(configProvider = { config })).handle(successRequest())

            assertThat(result.isError).isFalse()
            assertThat(result.singleText()).isEqualTo("No relevant ADL found for query: How to implement auth?")
        } finally {
            server.stop()
        }
    }

    private fun successRequest(): CallToolRequest {
        return CallToolRequest(
            CallToolRequestParams(
                name = GetAdlSkillTool.TOOL_NAME,
                arguments = buildJsonObject {
                    put(GetAdlSkillTool.USER_QUERY_PARAM, "How to implement auth?")
                },
            ),
        )
    }

    private fun reservePort(): Int = ServerSocket(0).use { it.localPort }

    private fun CallToolResult.singleText(): String = (content.single() as TextContent).text
}