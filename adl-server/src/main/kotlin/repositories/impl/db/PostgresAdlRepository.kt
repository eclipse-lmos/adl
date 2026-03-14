// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl.db

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.models.AdlVersion
import org.eclipse.lmos.adl.server.repositories.AdlRepository
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.time.OffsetDateTime
import javax.sql.DataSource

class PostgresAdlRepository(dataSource: DataSource) : AdlRepository {

    init {
        Database.connect(dataSource)
    }

    override suspend fun store(adl: Adl): Adl = newSuspendedTransaction {
        val owner = currentOwner()
        val scopedAdl = adl.copy(owner = owner)
        val now = OffsetDateTime.now()
        val existing = AdlsTable.selectAll().where { (AdlsTable.owner eq owner) and (AdlsTable.id eq scopedAdl.id) }.singleOrNull()

        if (existing != null) {
            // Save current version to history before updating
            val currentVersion = existing[AdlsTable.version]
            AdlVersionsTable.insert {
                it[AdlVersionsTable.owner] = owner
                it[adlId] = scopedAdl.id
                it[version] = currentVersion
                it[content] = existing[AdlsTable.content]
                it[tags] = existing[AdlsTable.tags]
                it[examples] = existing[AdlsTable.examples]
                it[output] = existing[AdlsTable.output]
                it[createdAt] = existing[AdlsTable.updatedAt]
            }

            val newVersion = currentVersion + 1
            AdlsTable.update({ (AdlsTable.owner eq owner) and (AdlsTable.id eq scopedAdl.id) }) {
                it[content] = scopedAdl.content
                it[tags] = scopedAdl.tags
                it[examples] = scopedAdl.examples
                it[output] = scopedAdl.output
                it[version] = newVersion
                it[updatedAt] = now
            }
            scopedAdl.copy(version = newVersion.toString())
        } else {
            AdlsTable.insert {
                it[AdlsTable.owner] = owner
                it[id] = scopedAdl.id
                it[content] = scopedAdl.content
                it[tags] = scopedAdl.tags
                it[examples] = scopedAdl.examples
                it[output] = scopedAdl.output
                it[version] = 1
                it[createdAt] = now
                it[updatedAt] = now
            }
            scopedAdl.copy(version = "1")
        }
    }

    override suspend fun get(id: String): Adl? = newSuspendedTransaction {
        val owner = currentOwner()
        AdlsTable.selectAll().where { (AdlsTable.owner eq owner) and (AdlsTable.id eq id) }.singleOrNull()?.toAdl()
    }

    override suspend fun list(): List<Adl> = newSuspendedTransaction {
        val owner = currentOwner()
        AdlsTable.selectAll().where { AdlsTable.owner eq owner }.map { it.toAdl() }
    }

    override suspend fun deleteById(id: String): Unit = newSuspendedTransaction {
        val owner = currentOwner()
        AdlsTable.deleteWhere { (AdlsTable.owner eq owner) and (AdlsTable.id eq id) }
        Unit
    }

    override suspend fun getVersionHistory(id: String): List<AdlVersion> = newSuspendedTransaction {
        val owner = currentOwner()
        AdlVersionsTable.selectAll()
            .where { (AdlVersionsTable.owner eq owner) and (AdlVersionsTable.adlId eq id) }
            .orderBy(AdlVersionsTable.version, SortOrder.DESC)
            .map { it.toAdlVersion() }
    }

    override suspend fun getVersion(id: String, version: Int): AdlVersion? = newSuspendedTransaction {
        val owner = currentOwner()
        AdlVersionsTable.selectAll()
            .where { (AdlVersionsTable.owner eq owner) and (AdlVersionsTable.adlId eq id) and (AdlVersionsTable.version eq version) }
            .singleOrNull()?.toAdlVersion()
    }

    private fun ResultRow.toAdl() = Adl(
        owner = this[AdlsTable.owner],
        id = this[AdlsTable.id],
        content = this[AdlsTable.content],
        tags = this[AdlsTable.tags],
        examples = this[AdlsTable.examples],
        output = this[AdlsTable.output],
        createdAt = this[AdlsTable.createdAt].toString(),
        version = this[AdlsTable.version].toString(),
    )

    private fun ResultRow.toAdlVersion() = AdlVersion(
        owner = this[AdlVersionsTable.owner],
        adlId = this[AdlVersionsTable.adlId],
        version = this[AdlVersionsTable.version],
        content = this[AdlVersionsTable.content],
        tags = this[AdlVersionsTable.tags],
        examples = this[AdlVersionsTable.examples],
        output = this[AdlVersionsTable.output],
        createdAt = this[AdlVersionsTable.createdAt].toString(),
    )
}
