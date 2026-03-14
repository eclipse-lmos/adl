// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.inbound.query

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Query
import graphql.schema.DataFetchingEnvironment
import org.eclipse.lmos.adl.server.withRequestOwner
import org.eclipse.lmos.adl.server.models.RolePrompt
import org.eclipse.lmos.adl.server.repositories.RolePromptRepository

/**
 * GraphQL Query for retrieving role prompts.
 */
class RolePromptQuery(private val rolePromptRepository: RolePromptRepository) : Query {

    @GraphQLDescription("Retrieves all role prompts.")
    suspend fun rolePrompts(environment: DataFetchingEnvironment? = null): List<RolePrompt> =
        withRequestOwner(environment) { rolePromptRepository.findAll() }

    @GraphQLDescription("Retrieves a role prompt by ID.")
    suspend fun rolePrompt(
        @GraphQLDescription("The unique identifier of the role prompt") id: String,
        environment: DataFetchingEnvironment? = null,
    ): RolePrompt? = withRequestOwner(environment) { rolePromptRepository.findById(id) }
}

