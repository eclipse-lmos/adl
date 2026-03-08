// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.mutation

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Mutation
import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.repositories.AgentRepository
import java.util.UUID

class AgentMutation(private val agentRepository: AgentRepository) : Mutation {

    @GraphQLDescription("Creates or updates an agent.")
    fun saveAgent(
        @GraphQLDescription("The agent to save") input: SaveAgentInput
    ): Agent {
        require(input.name.isNotBlank()) { "Agent name must not be blank." }

        val agent = Agent(
            id = input.id ?: UUID.randomUUID().toString(),
            name = input.name,
            active = input.active,
            description = input.description,
            models = input.models,
            tags = input.tags,
            mcpServers = input.mcpServers,
            role = input.role,
            corePrompt = input.corePrompt,
        )
        return agentRepository.save(agent)
    }

    @GraphQLDescription("Deletes an agent.")
    fun deleteAgent(
        @GraphQLDescription("The unique identifier of the agent") id: String
    ): Boolean = agentRepository.delete(id)
}

@GraphQLDescription("Input for creating or updating an agent")
data class SaveAgentInput(
    @property:GraphQLDescription("The unique identifier of the agent (optional)")
    val id: String? = null,
    @property:GraphQLDescription("The name of the agent")
    val name: String,
    @property:GraphQLDescription("Whether the agent is active")
    val active: Boolean = true,
    @property:GraphQLDescription("An optional description of the agent")
    val description: String? = null,
    @property:GraphQLDescription("The models supported by the agent")
    val models: List<String>? = null,
    @property:GraphQLDescription("Tags associated with the agent")
    val tags: List<String>? = null,
    @property:GraphQLDescription("The MCP servers used by the agent")
    val mcpServers: List<String>? = null,
    @property:GraphQLDescription("An optional role description for the agent")
    val role: String? = null,
    @property:GraphQLDescription("An optional core prompt for the agent")
    val corePrompt: String? = null,
)
