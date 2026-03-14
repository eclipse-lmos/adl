// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories

/**
 * Repository contract for managing organizations and their API keys.
 */
interface OrganizationRepository {
    /**
     * Returns all stored organizations.
     */
    suspend fun findAll(): List<StoredOrganization>

    /**
     * Returns the organization with the given [id] or null when it does not exist.
     */
    suspend fun findById(id: String): StoredOrganization?

    /**
     * Creates a new organization and issues its initial API key.
     */
    suspend fun create(command: CreateOrganizationCommand): IssuedOrganization

    /**
     * Updates mutable metadata of an existing organization.
     */
    suspend fun update(command: UpdateOrganizationCommand): StoredOrganization

    /**
     * Issues a new API key for an existing organization.
     */
    suspend fun createApiKey(command: CreateOrganizationApiKeyCommand): IssuedOrganizationApiKey

    /**
     * Revokes an API key of an existing organization.
     */
    suspend fun revokeApiKey(organizationId: String, apiKeyId: String): StoredOrganization

    /**
     * Rotates an existing API key by revoking it and issuing a replacement key atomically.
     */
    suspend fun rotateApiKey(command: RotateOrganizationApiKeyCommand): IssuedOrganizationApiKey

    /**
     * Deletes an organization and all of its issued API keys.
     */
    suspend fun delete(id: String): Boolean

    /**
     * Resolves a raw API key to its organization when valid and not revoked.
     */
    suspend fun resolveByApiKey(rawApiKey: String): StoredOrganization?
}

/**
 * Command for creating a new organization.
 */
data class CreateOrganizationCommand(
    val id: String,
    val name: String,
    val descriptions: String,
    val initialApiKeyLabel: String,
)

/**
 * Command for updating an organization.
 */
data class UpdateOrganizationCommand(
    val id: String,
    val name: String,
    val descriptions: String,
)

/**
 * Command for issuing a new API key.
 */
data class CreateOrganizationApiKeyCommand(
    val organizationId: String,
    val label: String,
)

/**
 * Command for rotating an existing API key.
 */
data class RotateOrganizationApiKeyCommand(
    val organizationId: String,
    val apiKeyId: String,
    val label: String? = null,
)

/**
 * Stored organization aggregate used by repository implementations.
 */
data class StoredOrganization(
    val id: String,
    val name: String,
    val descriptions: String,
    val apiKeys: List<StoredOrganizationApiKey>,
)

/**
 * Stored representation of an organization API key.
 */
data class StoredOrganizationApiKey(
    val id: String,
    val label: String,
    val hashedKey: String,
    val maskedKey: String,
    val createdAt: String,
    val revoked: Boolean,
)

/**
 * Result of creating an organization and its initial API key.
 */
data class IssuedOrganization(
    val organization: StoredOrganization,
    val createdApiKey: String,
)

/**
 * Result of issuing an additional organization API key.
 */
data class IssuedOrganizationApiKey(
    val organization: StoredOrganization,
    val apiKey: StoredOrganizationApiKey,
    val createdApiKey: String,
)

