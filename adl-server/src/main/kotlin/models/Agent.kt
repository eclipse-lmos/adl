// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.models

import com.expediagroup.graphql.generator.annotations.GraphQLDescription

@GraphQLDescription("An agent configuration")
data class Agent(
    @property:GraphQLDescription("The unique identifier of the agent")
    val id: String,
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
