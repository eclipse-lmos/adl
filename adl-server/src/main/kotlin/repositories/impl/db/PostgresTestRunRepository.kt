// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl.db

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.TestRunResult
import org.eclipse.lmos.adl.server.repositories.TestRunRepository
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.time.OffsetDateTime
import javax.sql.DataSource

/**
 * PostgreSQL-backed implementation of [TestRunRepository].
 */
class PostgresTestRunRepository(dataSource: DataSource) : TestRunRepository {

    init {
        Database.connect(dataSource)
    }

    override suspend fun save(result: TestRunResult): TestRunResult = newSuspendedTransaction {
        val owner = currentOwner()
        val scopedResult = result.copy(owner = owner)
        TestRunsTable.insert {
            it[TestRunsTable.owner] = owner
            it[id] = scopedResult.id
            it[adlId] = scopedResult.adlId
            it[requestedTestCaseId] = scopedResult.requestedTestCaseId
            it[overallScore] = scopedResult.overallScore
            it[results] = scopedResult.results
            it[createdAt] = OffsetDateTime.parse(scopedResult.createdAt)
        }
        scopedResult
    }

    override suspend fun findById(id: String): TestRunResult? = newSuspendedTransaction {
        val owner = currentOwner()
        TestRunsTable.selectAll()
            .where {
                SqlExpressionBuilder.run {
                    (TestRunsTable.owner eq owner) and (TestRunsTable.id eq id)
                }
            }
            .singleOrNull()
            ?.toTestRunResult()
    }

    override suspend fun findByAdlId(adlId: String, limit: Int): List<TestRunResult> = newSuspendedTransaction {
        val owner = currentOwner()
        TestRunsTable.selectAll()
            .where {
                SqlExpressionBuilder.run {
                    (TestRunsTable.owner eq owner) and (TestRunsTable.adlId eq adlId)
                }
            }
            .orderBy(TestRunsTable.createdAt, SortOrder.DESC)
            .limit(limit.coerceIn(1, MAX_LIMIT))
            .map { it.toTestRunResult() }
    }

    override suspend fun delete(id: String): Boolean = newSuspendedTransaction {
        val owner = currentOwner()
        TestRunsTable.deleteWhere {
            SqlExpressionBuilder.run {
                (TestRunsTable.owner eq owner) and (TestRunsTable.id eq id)
            }
        } > 0
    }

    override suspend fun deleteByAdlId(adlId: String): Int = newSuspendedTransaction {
        val owner = currentOwner()
        TestRunsTable.deleteWhere {
            SqlExpressionBuilder.run {
                (TestRunsTable.owner eq owner) and (TestRunsTable.adlId eq adlId)
            }
        }
    }

    private fun ResultRow.toTestRunResult() = TestRunResult(
        id = this[TestRunsTable.id],
        adlId = this[TestRunsTable.adlId],
        owner = this[TestRunsTable.owner],
        createdAt = this[TestRunsTable.createdAt].toString(),
        requestedTestCaseId = this[TestRunsTable.requestedTestCaseId],
        overallScore = this[TestRunsTable.overallScore],
        results = this[TestRunsTable.results],
    )

    private companion object {
        const val MAX_LIMIT = 100
    }
}

