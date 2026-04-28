// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import org.assertj.core.api.Assertions.assertThat
import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemAgentRepository
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class FileSystemAgentRepositoryTest {

    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `save and find agent by id`() {
        val repository = FileSystemAgentRepository(tempDir.toFile())
        val agent = sampleAgent(id = "agent-1", name = "Code Reviewer")

        val saved = repository.save(agent)
        val loaded = repository.findById("agent-1")

        assertThat(saved).isEqualTo(agent)
        assertThat(loaded).isEqualTo(agent)
        assertThat(tempDir.toFile().listFiles { _, name -> name.endsWith(".agent.md") }).hasSize(1)
    }

    @Test
    fun `find all reads manually authored agent markdown files`() {
        tempDir.resolve("code-review.agent.md").toFile().writeText(
            """
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
        )
        val repository = FileSystemAgentRepository(tempDir.toFile())

        val agents = repository.findAll()

        assertThat(agents).containsExactly(
            Agent(
                id = "agent id",
                name = "agent_name",
                description = "Description",
                corePrompt = "corePrompt",
                tags = listOf("software", "engineering", "quality"),
                mcpServers = listOf("http://mcp-server"),
                models = listOf("model"),
            )
        )
        assertThat(repository.findById("agent id")).isEqualTo(agents.single())
    }

    @Test
    fun `save persists optional fields and can clear them on update`() {
        val repository = FileSystemAgentRepository(tempDir.toFile())
        repository.save(
            sampleAgent(
                id = "agent-2",
                name = "Planner",
                active = false,
                description = "Creates plans",
                corePrompt = "Think in milestones.",
                tags = listOf("planning"),
                mcpServers = listOf("http://mcp-server"),
                models = listOf("model-a"),
                role = "Planner role",
            )
        )

        val updated = repository.save(sampleAgent(id = "agent-2", name = "Planner", models = listOf("model-b")))

        assertThat(repository.findById("agent-2")).isEqualTo(updated)
        assertThat(repository.findById("agent-2")?.models).containsExactly("model-b")
        assertThat(repository.findById("agent-2")?.tags).isNull()
        assertThat(repository.findById("agent-2")?.description).isNull()
        assertThat(repository.findById("agent-2")?.active).isTrue()
    }

    @Test
    fun `delete removes saved and manually authored agent files`() {
        val repository = FileSystemAgentRepository(tempDir.toFile())
        repository.save(sampleAgent(id = "saved-agent", name = "Saved Agent"))
        tempDir.resolve("manual.agent.md").toFile().writeText(
            """
            ---
            id: "manual-agent"
            ---

            ## Agent: Manual Agent
            """.trimIndent()
        )

        assertThat(repository.delete("saved-agent")).isTrue()
        assertThat(repository.delete("manual-agent")).isTrue()

        assertThat(repository.findAll()).isEmpty()
        assertThat(repository.delete("missing-agent")).isFalse()
    }

    private fun sampleAgent(
        id: String,
        name: String,
        active: Boolean = true,
        description: String? = null,
        corePrompt: String? = null,
        tags: List<String>? = null,
        mcpServers: List<String>? = null,
        models: List<String>? = null,
        role: String? = null,
    ) = Agent(
        id = id,
        name = name,
        active = active,
        description = description,
        corePrompt = corePrompt,
        tags = tags,
        mcpServers = mcpServers,
        models = models,
        role = role,
    )
}
