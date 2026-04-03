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
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class GetAdlSkillSuccessIntegrationTest {
    @Test
    fun `returns top ranked ADL content from the configured ADL server`() = runBlocking {
        withRunningFixtureServer { tool ->
            val result = tool.handle(successRequest())

            assertThat(result.isError).isFalse()
            assertThat(result.singleText()).contains("# Authentication ADL")
            assertThat(result.singleText()).doesNotContain("Lower Ranked ADL")
        }
    }

    @Test
    fun `meets the success-path p95 latency target in a controlled fixture setup`() = runBlocking {
        withRunningFixtureServer { tool ->
            val durationsMillis = (1..20).map {
                val startNanos = System.nanoTime()
                val result = tool.handle(successRequest())
                val elapsedMillis = (System.nanoTime() - startNanos) / 1_000_000

                assertThat(result.isError).isFalse()
                elapsedMillis
            }.sorted()

            val percentile95Millis = durationsMillis[((durationsMillis.size * 0.95).toInt() - 1).coerceAtLeast(0)]
            println("get_adl_skill success-path p95 latency: ${percentile95Millis}ms over ${durationsMillis.size} requests")

            assertThat(percentile95Millis).isLessThan(2_000)
        }
    }

    private suspend fun withRunningFixtureServer(assertions: suspend (GetAdlSkillTool) -> Unit) {
        val port = reservePort()
        val server = embeddedServer(CIO, host = "127.0.0.1", port = port) {
            routing {
                post("/") {
                    call.respondText(
                        AdlGraphQlFixtureSupport.readFixture("search-by-text-success.json"),
                        ContentType.Application.Json,
                    )
                }
            }
        }.start(wait = false)

        try {
            val config = AdlServerConfig(endpoint = "http://127.0.0.1:$port/", timeoutMillis = 2_000)
            val tool = GetAdlSkillTool(AdlLookupService(configProvider = { config }))

            assertions(tool)
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