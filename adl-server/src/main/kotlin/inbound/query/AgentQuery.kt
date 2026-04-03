// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.query

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Query
import graphql.schema.DataFetchingEnvironment
import org.eclipse.lmos.adl.server.withRequestOwnerBlocking
import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.repositories.AgentRepository

class AgentQuery(private val agentRepository: AgentRepository) : Query {

    @GraphQLDescription("Retrieves all agents.")
    fun agents(environment: DataFetchingEnvironment? = null): List<Agent> =
        withRequestOwnerBlocking(environment) { agentRepository.findAll() }

    @GraphQLDescription("Retrieves an agent by ID.")
    fun agent(
        @GraphQLDescription("The unique identifier of the agent") id: String,
        environment: DataFetchingEnvironment? = null,
    ): Agent? = withRequestOwnerBlocking(environment) { agentRepository.findById(id) }
}

