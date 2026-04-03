// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.query

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Query
import graphql.schema.DataFetchingEnvironment
import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.ensureGranted
import org.eclipse.lmos.adl.server.ownerAccess
import org.eclipse.lmos.adl.server.models.Organization
import org.eclipse.lmos.adl.server.models.toGraphQLModel
import org.eclipse.lmos.adl.server.repositories.OrganizationRepository
import org.slf4j.LoggerFactory

/**
 * GraphQL query for reading organizations and their masked API key metadata.
 */
class OrganizationQuery(
    private val organizationRepository: OrganizationRepository,
) : Query {
    private val log = LoggerFactory.getLogger(this::class.java)

    /**
     * Lists all organizations including masked API key metadata.
     */
    @GraphQLDescription("Lists all organizations including masked API key metadata")
    suspend fun organizations(environment: DataFetchingEnvironment? = null): List<Organization> {
        log.info("Listing organizations")
        val visibleOrganizationIds = environment.visibleOrganizationIds()
        return visibleOrganizationIds.mapNotNull { organizationId ->
            organizationRepository.findById(organizationId)?.toGraphQLModel()
        }
    }

    /**
     * Returns a single organization by id including masked API key metadata.
     */
    @GraphQLDescription("Returns a single organization by id including masked API key metadata")
    suspend fun organization(
        @GraphQLDescription("Stable organization identifier") id: String,
        environment: DataFetchingEnvironment? = null,
    ): Organization? {
        log.info("Retrieving organization with id: {}", id)
        val visibleOrganizationIds = environment.visibleOrganizationIds()
        if (id !in visibleOrganizationIds) {
            return null
        }

        return organizationRepository.findById(id)?.toGraphQLModel()
    }

    private fun DataFetchingEnvironment?.visibleOrganizationIds(): Set<String> {
        val access = this?.ownerAccess() ?: return setOf(DEFAULT_OWNER)
        access.ensureGranted()
        return if (access.owner == DEFAULT_OWNER) {
            setOf(DEFAULT_OWNER)
        } else {
            linkedSetOf(DEFAULT_OWNER, access.owner)
        }
    }
}

