// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.models

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import org.eclipse.lmos.adl.server.repositories.IssuedOrganization
import org.eclipse.lmos.adl.server.repositories.IssuedOrganizationApiKey
import org.eclipse.lmos.adl.server.repositories.StoredOrganization
import org.eclipse.lmos.adl.server.repositories.StoredOrganizationApiKey

/**
 * Public GraphQL representation of an organization.
 */
@GraphQLDescription("An organization that owns scoped ADL resources")
data class Organization(
    @property:GraphQLDescription("Stable identifier of the organization and canonical owner value")
    val id: String,
    @property:GraphQLDescription("Human-readable display name")
    val name: String,
    @property:GraphQLDescription("Free-form description of the organization")
    val descriptions: String,
    @property:GraphQLDescription("Issued API keys for the organization")
    val apiKeys: List<OrganizationApiKey>,
)

/**
 * Public GraphQL representation of a masked organization API key.
 */
@GraphQLDescription("A masked organization API key")
data class OrganizationApiKey(
    @property:GraphQLDescription("Unique identifier of the API key")
    val id: String,
    @property:GraphQLDescription("Human-readable label for the API key")
    val label: String,
    @property:GraphQLDescription("Masked representation of the API key")
    val maskedKey: String,
    @property:GraphQLDescription("Creation timestamp in ISO-8601 format")
    val createdAt: String,
    @property:GraphQLDescription("Whether the API key has been revoked")
    val revoked: Boolean,
)

/**
 * Result returned when issuing a new API key.
 */
@GraphQLDescription("Organization payload plus a raw API key that is returned only once")
data class OrganizationApiKeyIssueResult(
    @property:GraphQLDescription("Organization metadata with masked API keys")
    val organization: Organization,
    @property:GraphQLDescription("Raw API key returned exactly once when created")
    val createdApiKey: String,
)

internal fun StoredOrganization.toGraphQLModel(): Organization = Organization(
    id = id,
    name = name,
    descriptions = descriptions,
    apiKeys = apiKeys.map(StoredOrganizationApiKey::toGraphQLModel),
)

internal fun StoredOrganizationApiKey.toGraphQLModel(): OrganizationApiKey = OrganizationApiKey(
    id = id,
    label = label,
    maskedKey = maskedKey,
    createdAt = createdAt,
    revoked = revoked,
)

internal fun IssuedOrganization.toGraphQLModel(): OrganizationApiKeyIssueResult = OrganizationApiKeyIssueResult(
    organization = organization.toGraphQLModel(),
    createdApiKey = createdApiKey,
)

internal fun IssuedOrganizationApiKey.toGraphQLModel(): OrganizationApiKeyIssueResult = OrganizationApiKeyIssueResult(
    organization = organization.toGraphQLModel(),
    createdApiKey = createdApiKey,
)

