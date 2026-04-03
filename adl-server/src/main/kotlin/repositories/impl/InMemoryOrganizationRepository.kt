// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.generateOrganizationApiKey
import org.eclipse.lmos.adl.server.hashOrganizationApiKey
import org.eclipse.lmos.adl.server.maskOrganizationApiKey
import org.eclipse.lmos.adl.server.matchesOrganizationApiKey
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationApiKeyCommand
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationCommand
import org.eclipse.lmos.adl.server.repositories.IssuedOrganization
import org.eclipse.lmos.adl.server.repositories.IssuedOrganizationApiKey
import org.eclipse.lmos.adl.server.repositories.OrganizationRepository
import org.eclipse.lmos.adl.server.repositories.RotateOrganizationApiKeyCommand
import org.eclipse.lmos.adl.server.repositories.StoredOrganization
import org.eclipse.lmos.adl.server.repositories.StoredOrganizationApiKey
import org.eclipse.lmos.adl.server.repositories.UpdateOrganizationCommand
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory implementation of [OrganizationRepository].
 */
class InMemoryOrganizationRepository : OrganizationRepository {
    private val organizations = ConcurrentHashMap<String, StoredOrganization>()

    init {
        organizations[DEFAULT_OWNER] = StoredOrganization(
            id = DEFAULT_OWNER,
            name = "Public",
            descriptions = "Default public owner used for backwards-compatible development mode.",
            apiKeys = emptyList(),
        )
    }

    override suspend fun findAll(): List<StoredOrganization> = organizations.values.sortedBy { it.id }

    override suspend fun findById(id: String): StoredOrganization? = organizations[id]

    override suspend fun create(command: CreateOrganizationCommand): IssuedOrganization {
        require(command.id != DEFAULT_OWNER) { "The organization id '$DEFAULT_OWNER' is reserved." }
        require(command.id.matches(ORGANIZATION_ID_PATTERN)) {
            "Organization id must be a lowercase slug containing only letters, numbers, and dashes."
        }
        require(command.name.isNotBlank()) { "Organization name must not be blank." }
        require(command.initialApiKeyLabel.isNotBlank()) { "Initial API key label must not be blank." }

        if (organizations.containsKey(command.id)) {
            throw IllegalStateException("Organization with id ${command.id} already exists.")
        }

        val issuedKey = issueApiKey(command.initialApiKeyLabel)
        val organization = StoredOrganization(
            id = command.id,
            name = command.name.trim(),
            descriptions = command.descriptions.trim(),
            apiKeys = listOf(issuedKey.storedKey),
        )
        organizations[organization.id] = organization
        return IssuedOrganization(organization = organization, createdApiKey = issuedKey.rawKey)
    }

    override suspend fun update(command: UpdateOrganizationCommand): StoredOrganization {
        require(command.name.isNotBlank()) { "Organization name must not be blank." }

        val existing = organizations[command.id] ?: throw NoSuchElementException("Organization with id ${command.id} not found.")
        require(existing.id != DEFAULT_OWNER) { "The public organization cannot be modified." }

        val updated = existing.copy(name = command.name.trim(), descriptions = command.descriptions.trim())
        organizations[updated.id] = updated
        return updated
    }

    override suspend fun createApiKey(command: CreateOrganizationApiKeyCommand): IssuedOrganizationApiKey {
        require(command.label.isNotBlank()) { "API key label must not be blank." }
        val existing = organizations[command.organizationId]
            ?: throw NoSuchElementException("Organization with id ${command.organizationId} not found.")
        require(existing.id != DEFAULT_OWNER) { "The public organization cannot issue API keys." }

        val issuedKey = issueApiKey(command.label)
        val updated = existing.copy(apiKeys = existing.apiKeys + issuedKey.storedKey)
        organizations[updated.id] = updated
        return IssuedOrganizationApiKey(organization = updated, apiKey = issuedKey.storedKey, createdApiKey = issuedKey.rawKey)
    }

    override suspend fun revokeApiKey(organizationId: String, apiKeyId: String): StoredOrganization {
        val existing = organizations[organizationId] ?: throw NoSuchElementException("Organization with id $organizationId not found.")
        require(existing.id != DEFAULT_OWNER) { "The public organization does not manage API keys." }
        require(existing.apiKeys.count { !it.revoked && it.id != apiKeyId } > 0) {
            "Organizations must retain at least one active API key. Rotate the last key instead of revoking it."
        }

        var found = false
        val updatedKeys = existing.apiKeys.map { apiKey ->
            if (apiKey.id == apiKeyId) {
                found = true
                require(!apiKey.revoked) { "API key with id $apiKeyId is already revoked for organization $organizationId." }
                apiKey.copy(revoked = true)
            } else {
                apiKey
            }
        }
        if (!found) {
            throw NoSuchElementException("API key with id $apiKeyId not found for organization $organizationId.")
        }

        val updated = existing.copy(apiKeys = updatedKeys)
        organizations[updated.id] = updated
        return updated
    }

    override suspend fun rotateApiKey(command: RotateOrganizationApiKeyCommand): IssuedOrganizationApiKey {
        val existing = organizations[command.organizationId]
            ?: throw NoSuchElementException("Organization with id ${command.organizationId} not found.")
        require(existing.id != DEFAULT_OWNER) { "The public organization does not manage API keys." }

        val apiKeyToRotate = existing.apiKeys.firstOrNull { it.id == command.apiKeyId }
            ?: throw NoSuchElementException("API key with id ${command.apiKeyId} not found for organization ${command.organizationId}.")
        require(!apiKeyToRotate.revoked) { "API key with id ${command.apiKeyId} is already revoked for organization ${command.organizationId}." }

        val issuedKey = issueApiKey(command.label?.takeIf { it.isNotBlank() } ?: apiKeyToRotate.label)
        val updated = existing.copy(
            apiKeys = existing.apiKeys.map { apiKey ->
                if (apiKey.id == command.apiKeyId) apiKey.copy(revoked = true) else apiKey
            } + issuedKey.storedKey,
        )
        organizations[updated.id] = updated
        return IssuedOrganizationApiKey(organization = updated, apiKey = issuedKey.storedKey, createdApiKey = issuedKey.rawKey)
    }

    override suspend fun delete(id: String): Boolean {
        require(id != DEFAULT_OWNER) { "The public organization cannot be deleted." }
        return organizations.remove(id) != null
    }

    override suspend fun resolveByApiKey(rawApiKey: String): StoredOrganization? {
        val organization = organizations.values.firstOrNull { candidate ->
            candidate.apiKeys.any { apiKey -> !apiKey.revoked && matchesOrganizationApiKey(rawApiKey, apiKey.hashedKey) }
        }
        return organization?.takeIf { it.id != DEFAULT_OWNER }
    }

    private fun issueApiKey(label: String): IssuedStoredApiKey {
        val rawKey = generateOrganizationApiKey()
        val storedKey = StoredOrganizationApiKey(
            id = UUID.randomUUID().toString(),
            label = label.trim(),
            hashedKey = hashOrganizationApiKey(rawKey),
            maskedKey = maskOrganizationApiKey(rawKey),
            createdAt = Instant.now().toString(),
            revoked = false,
        )
        return IssuedStoredApiKey(rawKey = rawKey, storedKey = storedKey)
    }

    private data class IssuedStoredApiKey(
        val rawKey: String,
        val storedKey: StoredOrganizationApiKey,
    )

    private companion object {
        val ORGANIZATION_ID_PATTERN = Regex("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
    }
}

