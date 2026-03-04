// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl.db

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
        val now = OffsetDateTime.now()
        val existing = AdlsTable.selectAll().where { AdlsTable.id eq adl.id }.singleOrNull()

        if (existing != null) {
            // Save current version to history before updating
            val currentVersion = existing[AdlsTable.version]
            AdlVersionsTable.insert {
                it[adlId] = adl.id
                it[version] = currentVersion
                it[content] = existing[AdlsTable.content]
                it[tags] = existing[AdlsTable.tags]
                it[examples] = existing[AdlsTable.examples]
                it[output] = existing[AdlsTable.output]
                it[createdAt] = existing[AdlsTable.updatedAt]
            }

            val newVersion = currentVersion + 1
            AdlsTable.update({ AdlsTable.id eq adl.id }) {
                it[content] = adl.content
                it[tags] = adl.tags
                it[examples] = adl.examples
                it[output] = adl.output
                it[version] = newVersion
                it[updatedAt] = now
            }
            adl.copy(version = newVersion.toString())
        } else {
            AdlsTable.insert {
                it[id] = adl.id
                it[content] = adl.content
                it[tags] = adl.tags
                it[examples] = adl.examples
                it[output] = adl.output
                it[version] = 1
                it[createdAt] = now
                it[updatedAt] = now
            }
            adl.copy(version = "1")
        }
    }

    override suspend fun get(id: String): Adl? = newSuspendedTransaction {
        AdlsTable.selectAll().where { AdlsTable.id eq id }.singleOrNull()?.toAdl()
    }

    override suspend fun list(): List<Adl> = newSuspendedTransaction {
        AdlsTable.selectAll().map { it.toAdl() }
    }

    override suspend fun deleteById(id: String): Unit = newSuspendedTransaction {
        AdlsTable.deleteWhere { AdlsTable.id eq id }
        Unit
    }

    override suspend fun getVersionHistory(id: String): List<AdlVersion> = newSuspendedTransaction {
        AdlVersionsTable.selectAll()
            .where { AdlVersionsTable.adlId eq id }
            .orderBy(AdlVersionsTable.version, SortOrder.DESC)
            .map { it.toAdlVersion() }
    }

    override suspend fun getVersion(id: String, version: Int): AdlVersion? = newSuspendedTransaction {
        AdlVersionsTable.selectAll()
            .where { (AdlVersionsTable.adlId eq id) and (AdlVersionsTable.version eq version) }
            .singleOrNull()?.toAdlVersion()
    }

    private fun ResultRow.toAdl() = Adl(
        id = this[AdlsTable.id],
        content = this[AdlsTable.content],
        tags = this[AdlsTable.tags],
        examples = this[AdlsTable.examples],
        output = this[AdlsTable.output],
        createdAt = this[AdlsTable.createdAt].toString(),
        version = this[AdlsTable.version].toString(),
    )

    private fun ResultRow.toAdlVersion() = AdlVersion(
        adlId = this[AdlVersionsTable.adlId],
        version = this[AdlVersionsTable.version],
        content = this[AdlVersionsTable.content],
        tags = this[AdlVersionsTable.tags],
        examples = this[AdlVersionsTable.examples],
        output = this[AdlVersionsTable.output],
        createdAt = this[AdlVersionsTable.createdAt].toString(),
    )
}
