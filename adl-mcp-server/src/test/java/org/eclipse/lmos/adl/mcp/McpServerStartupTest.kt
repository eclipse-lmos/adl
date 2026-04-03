// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp

import org.assertj.core.api.Assertions.assertThat
import org.eclipse.lmos.adl.mcp.tools.adlskill.GetAdlSkillTool
import org.junit.jupiter.api.Test

class McpServerStartupTest {
    @Test
    fun `configureServer registers prompts and get_adl_skill tool`() {
        val server = McpServer().configureServer()

        assertThat(server.prompts).containsKey("get-system-prompt")
        assertThat(server.tools).containsKey(GetAdlSkillTool.TOOL_NAME)
    }
}