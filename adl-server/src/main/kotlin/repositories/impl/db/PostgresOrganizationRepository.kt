// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl.db

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
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import java.time.OffsetDateTime
import java.util.UUID
import javax.sql.DataSource

/**
 * PostgreSQL-backed implementation of [OrganizationRepository].
 */
class PostgresOrganizationRepository(dataSource: DataSource) : OrganizationRepository {
    init {
        Database.connect(dataSource)
        transaction {
            val existingPublic = OrganizationsTable.selectAll()
                .where { OrganizationsTable.id eq DEFAULT_OWNER }
                .singleOrNull()
            if (existingPublic == null) {
                val now = OffsetDateTime.now()
                OrganizationsTable.insert {
                    it[id] = DEFAULT_OWNER
                    it[name] = "Public"
                    it[descriptions] = "Default public owner used for backwards-compatible development mode."
                    it[createdAt] = now
                    it[updatedAt] = now
                }
            }
        }
    }

    override suspend fun findAll(): List<StoredOrganization> = newSuspendedTransaction {
        loadOrganizations()
    }

    override suspend fun findById(id: String): StoredOrganization? = newSuspendedTransaction {
        loadOrganizations(organizationIds = setOf(id)).firstOrNull()
    }

    override suspend fun create(command: CreateOrganizationCommand): IssuedOrganization = newSuspendedTransaction {
        require(command.id != DEFAULT_OWNER) { "The organization id '$DEFAULT_OWNER' is reserved." }
        require(command.id.matches(ORGANIZATION_ID_PATTERN)) {
            "Organization id must be a lowercase slug containing only letters, numbers, and dashes."
        }
        require(command.name.isNotBlank()) { "Organization name must not be blank." }
        require(command.initialApiKeyLabel.isNotBlank()) { "Initial API key label must not be blank." }

        if (OrganizationsTable.selectAll().where { OrganizationsTable.id eq command.id }.singleOrNull() != null) {
            throw IllegalStateException("Organization with id ${command.id} already exists.")
        }

        val now = OffsetDateTime.now()
        OrganizationsTable.insert {
            it[id] = command.id
            it[name] = command.name.trim()
            it[descriptions] = command.descriptions.trim()
            it[createdAt] = now
            it[updatedAt] = now
        }

        val issuedKey = insertApiKey(command.id, command.initialApiKeyLabel)
        val organization = loadOrganizations(setOf(command.id)).first()
        IssuedOrganization(organization = organization, createdApiKey = issuedKey.createdApiKey)
    }

    override suspend fun update(command: UpdateOrganizationCommand): StoredOrganization = newSuspendedTransaction {
        require(command.name.isNotBlank()) { "Organization name must not be blank." }
        require(command.id != DEFAULT_OWNER) { "The public organization cannot be modified." }

        val updatedRows = OrganizationsTable.update({ OrganizationsTable.id eq command.id }) {
            it[name] = command.name.trim()
            it[descriptions] = command.descriptions.trim()
            it[updatedAt] = OffsetDateTime.now()
        }
        if (updatedRows == 0) {
            throw NoSuchElementException("Organization with id ${command.id} not found.")
        }
        loadOrganizations(setOf(command.id)).first()
    }

    override suspend fun createApiKey(command: CreateOrganizationApiKeyCommand): IssuedOrganizationApiKey = newSuspendedTransaction {
        require(command.label.isNotBlank()) { "API key label must not be blank." }
        require(command.organizationId != DEFAULT_OWNER) { "The public organization cannot issue API keys." }

        val organizationExists = OrganizationsTable.selectAll()
            .where { OrganizationsTable.id eq command.organizationId }
            .singleOrNull() != null
        if (!organizationExists) {
            throw NoSuchElementException("Organization with id ${command.organizationId} not found.")
        }

        val issuedKey = insertApiKey(command.organizationId, command.label)
        val organization = loadOrganizations(setOf(command.organizationId)).first()
        IssuedOrganizationApiKey(organization = organization, apiKey = issuedKey.apiKey, createdApiKey = issuedKey.createdApiKey)
    }

    override suspend fun revokeApiKey(organizationId: String, apiKeyId: String): StoredOrganization = newSuspendedTransaction {
        require(organizationId != DEFAULT_OWNER) { "The public organization does not manage API keys." }

        val apiKeyRow = OrganizationApiKeysTable.selectAll()
            .where { (OrganizationApiKeysTable.organizationId eq organizationId) and (OrganizationApiKeysTable.id eq apiKeyId) }
            .singleOrNull()
            ?: throw NoSuchElementException("API key with id $apiKeyId not found for organization $organizationId.")
        require(!apiKeyRow[OrganizationApiKeysTable.revoked]) {
            "API key with id $apiKeyId is already revoked for organization $organizationId."
        }
        require(activeApiKeyCount(organizationId, excludingApiKeyId = apiKeyId) > 0) {
            "Organizations must retain at least one active API key. Rotate the last key instead of revoking it."
        }

        val updatedRows = OrganizationApiKeysTable.update({
            (OrganizationApiKeysTable.organizationId eq organizationId) and (OrganizationApiKeysTable.id eq apiKeyId)
        }) {
            it[revoked] = true
        }
        if (updatedRows == 0) {
            throw NoSuchElementException("API key with id $apiKeyId not found for organization $organizationId.")
        }
        loadOrganizations(setOf(organizationId)).first()
    }

    override suspend fun rotateApiKey(command: RotateOrganizationApiKeyCommand): IssuedOrganizationApiKey = newSuspendedTransaction {
        require(command.organizationId != DEFAULT_OWNER) { "The public organization does not manage API keys." }

        val apiKeyRow = OrganizationApiKeysTable.selectAll()
            .where {
                (OrganizationApiKeysTable.organizationId eq command.organizationId) and
                    (OrganizationApiKeysTable.id eq command.apiKeyId)
            }
            .singleOrNull()
            ?: throw NoSuchElementException(
                "API key with id ${command.apiKeyId} not found for organization ${command.organizationId}.",
            )
        require(!apiKeyRow[OrganizationApiKeysTable.revoked]) {
            "API key with id ${command.apiKeyId} is already revoked for organization ${command.organizationId}."
        }

        val issuedKey = insertApiKey(
            organizationId = command.organizationId,
            label = command.label?.takeIf { it.isNotBlank() } ?: apiKeyRow[OrganizationApiKeysTable.label],
        )
        OrganizationApiKeysTable.update({
            (OrganizationApiKeysTable.organizationId eq command.organizationId) and
                (OrganizationApiKeysTable.id eq command.apiKeyId)
        }) {
            it[revoked] = true
        }

        val organization = loadOrganizations(setOf(command.organizationId)).first()
        IssuedOrganizationApiKey(organization = organization, apiKey = issuedKey.apiKey, createdApiKey = issuedKey.createdApiKey)
    }

    override suspend fun delete(id: String): Boolean = newSuspendedTransaction {
        require(id != DEFAULT_OWNER) { "The public organization cannot be deleted." }

        OrganizationApiKeysTable.deleteWhere { OrganizationApiKeysTable.organizationId eq id }
        OrganizationsTable.deleteWhere { OrganizationsTable.id eq id } > 0
    }

    override suspend fun resolveByApiKey(rawApiKey: String): StoredOrganization? = newSuspendedTransaction {
        val hashedApiKey = hashOrganizationApiKey(rawApiKey)
        val keyRow = OrganizationApiKeysTable.selectAll()
            .where { (OrganizationApiKeysTable.hashedKey eq hashedApiKey) and (OrganizationApiKeysTable.revoked eq false) }
            .singleOrNull()
            ?: return@newSuspendedTransaction null

        if (!matchesOrganizationApiKey(rawApiKey, keyRow[OrganizationApiKeysTable.hashedKey])) {
            return@newSuspendedTransaction null
        }

        loadOrganizations(setOf(keyRow[OrganizationApiKeysTable.organizationId])).firstOrNull()
            ?.takeIf { it.id != DEFAULT_OWNER }
    }

    private fun insertApiKey(organizationId: String, label: String): IssuedKeyRecord {
        val rawApiKey = generateOrganizationApiKey()
        val apiKey = StoredOrganizationApiKey(
            id = UUID.randomUUID().toString(),
            label = label.trim(),
            hashedKey = hashOrganizationApiKey(rawApiKey),
            maskedKey = maskOrganizationApiKey(rawApiKey),
            createdAt = OffsetDateTime.now().toString(),
            revoked = false,
        )
        OrganizationApiKeysTable.insert {
            it[id] = apiKey.id
            it[OrganizationApiKeysTable.organizationId] = organizationId
            it[OrganizationApiKeysTable.label] = apiKey.label
            it[hashedKey] = apiKey.hashedKey
            it[maskedKey] = apiKey.maskedKey
            it[createdAt] = OffsetDateTime.parse(apiKey.createdAt)
            it[revoked] = false
        }
        return IssuedKeyRecord(apiKey = apiKey, createdApiKey = rawApiKey)
    }

    private fun loadOrganizations(organizationIds: Set<String>? = null): List<StoredOrganization> {
        val organizations = OrganizationsTable.selectAll().let { query ->
            if (organizationIds == null) query.toList() else query.where { OrganizationsTable.id inList organizationIds }.toList()
        }
        if (organizations.isEmpty()) {
            return emptyList()
        }

        val ids = organizations.map { it[OrganizationsTable.id] }
        val apiKeysByOrganizationId = OrganizationApiKeysTable.selectAll()
            .where { OrganizationApiKeysTable.organizationId inList ids }
            .orderBy(OrganizationApiKeysTable.createdAt, SortOrder.DESC)
            .groupBy { it[OrganizationApiKeysTable.organizationId] }
            .mapValues { (_, rows) -> rows.map(::toStoredOrganizationApiKey) }

        return organizations
            .sortedBy { it[OrganizationsTable.id] }
            .map { row ->
                StoredOrganization(
                    id = row[OrganizationsTable.id],
                    name = row[OrganizationsTable.name],
                    descriptions = row[OrganizationsTable.descriptions],
                    apiKeys = apiKeysByOrganizationId[row[OrganizationsTable.id]].orEmpty(),
                )
            }
    }

    private fun toStoredOrganizationApiKey(row: ResultRow): StoredOrganizationApiKey = StoredOrganizationApiKey(
        id = row[OrganizationApiKeysTable.id],
        label = row[OrganizationApiKeysTable.label],
        hashedKey = row[OrganizationApiKeysTable.hashedKey],
        maskedKey = row[OrganizationApiKeysTable.maskedKey],
        createdAt = row[OrganizationApiKeysTable.createdAt].toString(),
        revoked = row[OrganizationApiKeysTable.revoked],
    )

    private data class IssuedKeyRecord(
        val apiKey: StoredOrganizationApiKey,
        val createdApiKey: String,
    )

    private fun activeApiKeyCount(organizationId: String, excludingApiKeyId: String? = null): Long {
        return OrganizationApiKeysTable.selectAll()
            .where {
                (OrganizationApiKeysTable.organizationId eq organizationId) and
                    (OrganizationApiKeysTable.revoked eq false)
            }
            .count { row -> excludingApiKeyId == null || row[OrganizationApiKeysTable.id] != excludingApiKeyId }
            .toLong()
    }

    private companion object {
        val ORGANIZATION_ID_PATTERN = Regex("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
    }
}

