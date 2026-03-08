// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.eclipse.lmos.adl.server.inbound.mutation.AgentMutation
import org.eclipse.lmos.adl.server.inbound.mutation.SaveAgentInput
import org.eclipse.lmos.adl.server.inbound.query.AgentQuery
import org.eclipse.lmos.adl.server.repositories.AgentRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAgentRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class AgentMutationQueryTest {

    private lateinit var repository: AgentRepository
    private lateinit var mutation: AgentMutation
    private lateinit var query: AgentQuery

    @BeforeEach
    fun setUp() {
        repository = InMemoryAgentRepository()
        mutation = AgentMutation(repository)
        query = AgentQuery(repository)
    }

    @Test
    fun `saveAgent creates a new agent with generated id`() {
        val agent = mutation.saveAgent(
            SaveAgentInput(
                name = "Research Assistant",
                active = false,
                description = "Finds and summarizes information",
                models = listOf("gpt-4.1", "o3-mini"),
                tags = listOf("research", "analysis"),
                mcpServers = listOf("jira", "filesystem"),
                role = "Senior Researcher",
                corePrompt = "Always provide concise, sourced summaries."
            )
        )

        assertThat(agent.id).isNotBlank()
        assertThat(agent.name).isEqualTo("Research Assistant")
        assertThat(agent.active).isFalse()
        assertThat(agent.models).containsExactlyInAnyOrder("gpt-4.1", "o3-mini")
        assertThat(query.agent(agent.id)).isEqualTo(agent)
        assertThat(query.agents()).containsExactly(agent)
    }

    @Test
    fun `saveAgent updates an existing agent and can clear optional fields`() {
        val created = mutation.saveAgent(
            SaveAgentInput(
                name = "Planner",
                active = true,
                description = "Creates execution plans",
                models = listOf("gpt-4.1"),
                tags = listOf("planning"),
                mcpServers = listOf("confluence"),
                role = "Planner role",
                corePrompt = "Think in milestones."
            )
        )

        val updated = mutation.saveAgent(
            SaveAgentInput(
                id = created.id,
                name = "Execution Planner",
                active = false,
                description = null,
                models = listOf("o3"),
                tags = null,
                mcpServers = null,
                role = null,
                corePrompt = null,
            )
        )

        assertThat(updated.id).isEqualTo(created.id)
        assertThat(updated.name).isEqualTo("Execution Planner")
        assertThat(updated.active).isFalse()
        assertThat(updated.description).isNull()
        assertThat(updated.models).containsExactly("o3")
        assertThat(updated.tags).isNull()
        assertThat(updated.mcpServers).isNull()
        assertThat(updated.role).isNull()
        assertThat(updated.corePrompt).isNull()
        assertThat(query.agent(created.id)).isEqualTo(updated)
    }

    @Test
    fun `saveAgent defaults active to true`() {
        val agent = mutation.saveAgent(SaveAgentInput(name = "Default Active Agent"))

        assertThat(agent.active).isTrue()
        assertThat(query.agent(agent.id)?.active).isTrue()
    }

    @Test
    fun `deleteAgent removes an existing agent`() {
        val created = mutation.saveAgent(SaveAgentInput(name = "Disposable Agent"))

        val deleted = mutation.deleteAgent(created.id)

        assertThat(deleted).isTrue()
        assertThat(query.agent(created.id)).isNull()
        assertThat(query.agents()).isEmpty()
    }

    @Test
    fun `saveAgent rejects blank names`() {
        assertThatThrownBy {
            mutation.saveAgent(SaveAgentInput(name = "   "))
        }.isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("must not be blank")
    }
}
