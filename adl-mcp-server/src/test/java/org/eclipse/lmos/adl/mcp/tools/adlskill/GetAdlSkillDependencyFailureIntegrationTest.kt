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
import java.net.ServerSocket
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class GetAdlSkillDependencyFailureIntegrationTest {
    @Test
    fun `returns timeout error when the ADL server responds too slowly`() = runBlocking {
        val port = reservePort()
        val server = embeddedServer(CIO, host = "127.0.0.1", port = port) {
            routing {
                post("/") {
                    delay(250)
                    call.respondText(
                        AdlGraphQlFixtureSupport.readFixture("search-by-text-success.json"),
                        ContentType.Application.Json,
                    )
                }
            }
        }.start(wait = false)

        try {
            val config = AdlServerConfig(endpoint = "http://127.0.0.1:$port/", timeoutMillis = 50)
            val result = GetAdlSkillTool(AdlLookupService(configProvider = { config })).handle(validRequest())

            assertThat(result.isError).isTrue()
            assertThat(result.singleText()).isEqualTo("ADL server request timed out.")
        } finally {
            server.stop()
        }
    }

    @Test
    fun `returns dependency error when the ADL server is unreachable`() = runBlocking {
        val port = reservePort()
        val config = AdlServerConfig(endpoint = "http://127.0.0.1:$port/", timeoutMillis = 100)

        val result = GetAdlSkillTool(AdlLookupService(configProvider = { config })).handle(validRequest())

        assertThat(result.isError).isTrue()
        assertThat(result.singleText()).isEqualTo("ADL server is unavailable.")
    }

    private fun validRequest(): CallToolRequest {
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