// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl.db

import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone

/**
 * Database table containing organizations.
 */
object OrganizationsTable : Table("organizations") {
    val id = varchar("id", 255)
    val name = varchar("name", 255)
    val descriptions = text("descriptions")
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

/**
 * Database table containing organization API keys.
 */
object OrganizationApiKeysTable : Table("organization_api_keys") {
    val id = varchar("id", 255)
    val organizationId = varchar("organization_id", 255).references(OrganizationsTable.id, onDelete = ReferenceOption.CASCADE)
    val label = varchar("label", 255)
    val hashedKey = varchar("hashed_key", 128)
    val maskedKey = varchar("masked_key", 255)
    val createdAt = timestampWithTimeZone("created_at")
    val revoked = bool("revoked").default(false)

    override val primaryKey = PrimaryKey(id)

    init {
        index(false, hashedKey)
        uniqueIndex(organizationId, label, createdAt)
    }
}

