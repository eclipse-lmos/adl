// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl.db

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone
import org.jetbrains.exposed.sql.json.jsonb
import kotlinx.serialization.json.Json
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer

private val jsonFormat = Json { ignoreUnknownKeys = true }

private fun stringListSerialize(value: List<String>): String =
    jsonFormat.encodeToString(ListSerializer(String.serializer()), value)

private fun stringListDeserialize(value: String): List<String> =
    jsonFormat.decodeFromString(ListSerializer(String.serializer()), value)

object AdlsTable : Table("adls") {
    val id = varchar("id", 255)
    val content = text("content")
    val tags = jsonb("tags", ::stringListSerialize, ::stringListDeserialize)
    val examples = jsonb("examples", ::stringListSerialize, ::stringListDeserialize)
    val output = text("output").nullable()
    val version = integer("version").default(1)
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object AdlVersionsTable : Table("adl_versions") {
    val id = long("id").autoIncrement()
    val adlId = varchar("adl_id", 255).references(AdlsTable.id)
    val version = integer("version")
    val content = text("content")
    val tags = jsonb("tags", ::stringListSerialize, ::stringListDeserialize)
    val examples = jsonb("examples", ::stringListSerialize, ::stringListDeserialize)
    val output = text("output").nullable()
    val createdAt = timestampWithTimeZone("created_at")

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex(adlId, version)
    }
}
