// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequestParams
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import io.mockk.coEvery
import io.mockk.mockk

class GetAdlSkillSuccessTest {
    @Test
    fun `returns top match content as successful text content`() = runBlocking {
        val lookupService = mockk<AdlLookupService>()
        coEvery { lookupService.lookup("How to implement auth?") } returns AdlLookupOutcome.MatchFound(
            "# Authentication ADL\n\nUse token-based authentication for service access.",
        )

        val tool = GetAdlSkillTool(lookupService)
        val result = tool.handle(successRequest())

        assertThat(result.isError).isFalse()
        assertThat(result.singleText()).contains("# Authentication ADL")
        assertThat(result.singleText()).doesNotContain("Lower Ranked ADL")
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

    private fun CallToolResult.singleText(): String = (content.single() as TextContent).text
}