// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.inbound.query

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Query
import org.eclipse.lmos.adl.server.repositories.TagRepository

/**
 * GraphQL Query for retrieving ADL tags.
 */
class TagsQuery(
    private val tagRepository: TagRepository,
) : Query {

    @GraphQLDescription("Returns a list of all tags used in the ADLs.")
    suspend fun tags(): List<String> {
        return tagRepository.list()
    }
}

