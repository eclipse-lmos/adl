// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.eclipse.lmos.adl.server.repositories.impl.ADLAgentParser
import org.junit.jupiter.api.Test

class ADLAgentParserTest {

    private val parser = ADLAgentParser()

    @Test
    fun `parse returns agent model from ADL agent markdown`() {
        val markdown = """
            ---
            id: "agent id"
            tags:
            - "software"
            - "engineering"
            - "quality"
            mcpServers:
            - http://mcp-server
            models:
            - model
            ---

            ## Agent: agent_name

            ### Description
            Description

            ### Prompt
            corePrompt
            """.trimIndent()

        val agent = parser.parse(markdown)

        assertThat(agent.id).isEqualTo("agent id")
        assertThat(agent.name).isEqualTo("agent_name")
        assertThat(agent.description).isEqualTo("Description")
        assertThat(agent.corePrompt).isEqualTo("corePrompt")
        assertThat(agent.tags).containsExactly("software", "engineering", "quality")
        assertThat(agent.mcpServers).containsExactly("http://mcp-server")
        assertThat(agent.models).containsExactly("model")
        assertThat(agent.active).isTrue()
        assertThat(agent.owner).isEqualTo(DEFAULT_OWNER)
    }

    @Test
    fun `parse supports multi-line sections and stops at next heading with same or higher level`() {
        val markdown = """
            ---
            id: reviewer
            active: false
            owner: team-a
            role: Senior reviewer
            ---

            # Agent: Reviewer

            ### Description
            Reviews code.

            Keeps feedback concise.

            #### Details
            This remains part of the description.

            ### Prompt
            Find blocking issues first.

            ## Other
            Ignored.
            """.trimIndent()

        val agent = parser.parse(markdown)

        assertThat(agent.id).isEqualTo("reviewer")
        assertThat(agent.name).isEqualTo("Reviewer")
        assertThat(agent.active).isFalse()
        assertThat(agent.owner).isEqualTo("team-a")
        assertThat(agent.role).isEqualTo("Senior reviewer")
        assertThat(agent.description).isEqualTo(
            """
            Reviews code.

            Keeps feedback concise.

            #### Details
            This remains part of the description.
            """.trimIndent()
        )
        assertThat(agent.corePrompt).isEqualTo("Find blocking issues first.")
    }

    @Test
    fun `parse uses provided fallbacks when metadata is absent`() {
        val markdown = """
            ## Agent: Fallback Agent

            ### Prompt
            Use defaults.
            """.trimIndent()

        val agent = parser.parse(markdown, fallbackId = "fallback-id", fallbackOwner = "fallback-owner")

        assertThat(agent.id).isEqualTo("fallback-id")
        assertThat(agent.name).isEqualTo("Fallback Agent")
        assertThat(agent.owner).isEqualTo("fallback-owner")
        assertThat(agent.corePrompt).isEqualTo("Use defaults.")
    }

    @Test
    fun `parse rejects markdown without id fallback or agent heading`() {
        assertThatThrownBy { parser.parse("### Prompt\nNo agent heading.") }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("must define an id or an Agent heading")
    }
}
