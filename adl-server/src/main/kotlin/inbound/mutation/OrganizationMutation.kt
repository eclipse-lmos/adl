// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.mutation

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Mutation
import graphql.schema.DataFetchingEnvironment
import org.eclipse.lmos.adl.server.models.Organization
import org.eclipse.lmos.adl.server.models.OrganizationApiKeyIssueResult
import org.eclipse.lmos.adl.server.models.toGraphQLModel
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationApiKeyCommand
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationCommand
import org.eclipse.lmos.adl.server.repositories.OrganizationRepository
import org.eclipse.lmos.adl.server.repositories.RotateOrganizationApiKeyCommand
import org.eclipse.lmos.adl.server.repositories.UpdateOrganizationCommand
import org.eclipse.lmos.adl.server.services.OrganizationLifecycle
import org.eclipse.lmos.adl.server.withPublicAdministration
import org.slf4j.LoggerFactory

/**
 * GraphQL mutation for bootstrap administration of organizations and organization API keys.
 */
class OrganizationMutation(
    private val organizationRepository: OrganizationRepository,
    private val organizationLifecycle: OrganizationLifecycle,
) : Mutation {
    private val log = LoggerFactory.getLogger(this::class.java)

    /**
     * Creates a new organization and returns its initial raw API key exactly once.
     */
    @GraphQLDescription("Creates a new organization and returns its initial raw API key exactly once")
    suspend fun createOrganization(
        @GraphQLDescription("Stable organization identifier") id: String,
        @GraphQLDescription("Display name of the organization") name: String,
        @GraphQLDescription("Description or markdown shown in the UI") descriptions: String,
        @GraphQLDescription("Label of the initial API key") initialApiKeyLabel: String? = null,
        environment: DataFetchingEnvironment? = null,
    ): OrganizationApiKeyIssueResult {
        log.info("Creating organization with id: {}", id)
        return withPublicAdministration(environment) {
            organizationRepository.create(
                CreateOrganizationCommand(
                    id = id,
                    name = name,
                    descriptions = descriptions,
                    initialApiKeyLabel = initialApiKeyLabel?.takeIf { it.isNotBlank() } ?: "master",
                ),
            ).toGraphQLModel()
        }
    }

    /**
     * Updates organization metadata.
     */
    @GraphQLDescription("Updates mutable organization metadata")
    suspend fun updateOrganization(
        @GraphQLDescription("Stable organization identifier") id: String,
        @GraphQLDescription("Display name of the organization") name: String,
        @GraphQLDescription("Description or markdown shown in the UI") descriptions: String,
        environment: DataFetchingEnvironment? = null,
    ): Organization {
        log.info("Updating organization with id: {}", id)
        return withPublicAdministration(environment) {
            organizationRepository.update(
                UpdateOrganizationCommand(
                    id = id,
                    name = name,
                    descriptions = descriptions,
                ),
            ).toGraphQLModel()
        }
    }

    /**
     * Issues an additional API key for an existing organization.
     */
    @GraphQLDescription("Issues a new API key for an organization and returns the raw key exactly once")
    suspend fun createOrganizationApiKey(
        @GraphQLDescription("Stable organization identifier") organizationId: String,
        @GraphQLDescription("Label of the new API key") label: String,
        environment: DataFetchingEnvironment? = null,
    ): OrganizationApiKeyIssueResult {
        log.info("Creating organization API key for organization: {}", organizationId)
        return withPublicAdministration(environment) {
            organizationRepository.createApiKey(
                CreateOrganizationApiKeyCommand(
                    organizationId = organizationId,
                    label = label,
                ),
            ).toGraphQLModel()
        }
    }

    /**
     * Revokes an existing organization API key.
     */
    @GraphQLDescription("Revokes an existing organization API key")
    suspend fun revokeOrganizationApiKey(
        @GraphQLDescription("Stable organization identifier") organizationId: String,
        @GraphQLDescription("Identifier of the API key to revoke") apiKeyId: String,
        environment: DataFetchingEnvironment? = null,
    ): Organization {
        log.info("Revoking organization API key {} for organization {}", apiKeyId, organizationId)
        return withPublicAdministration(environment) {
            organizationRepository.revokeApiKey(organizationId, apiKeyId).toGraphQLModel()
        }
    }

    /**
     * Rotates an existing organization API key and returns the replacement raw key once.
     */
    @GraphQLDescription("Rotates an existing organization API key and returns the replacement raw key once")
    suspend fun rotateOrganizationApiKey(
        @GraphQLDescription("Stable organization identifier") organizationId: String,
        @GraphQLDescription("Identifier of the API key to rotate") apiKeyId: String,
        @GraphQLDescription("Optional label for the replacement key") label: String? = null,
        environment: DataFetchingEnvironment? = null,
    ): OrganizationApiKeyIssueResult {
        log.info("Rotating organization API key {} for organization {}", apiKeyId, organizationId)
        return withPublicAdministration(environment) {
            organizationRepository.rotateApiKey(
                RotateOrganizationApiKeyCommand(
                    organizationId = organizationId,
                    apiKeyId = apiKeyId,
                    label = label,
                ),
            ).toGraphQLModel()
        }
    }

    /**
     * Deletes an organization and all owner-scoped data that belongs to it.
     */
    @GraphQLDescription("Deletes an organization and all owner-scoped data that belongs to it")
    suspend fun deleteOrganization(
        @GraphQLDescription("Stable organization identifier") id: String,
        environment: DataFetchingEnvironment? = null,
    ): Boolean {
        log.info("Deleting organization with id: {}", id)
        return withPublicAdministration(environment) {
            organizationLifecycle.deleteOrganization(id)
        }
    }
}

