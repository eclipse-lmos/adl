// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl.db

import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import org.eclipse.lmos.adl.server.models.TestExecutionResult
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestampWithTimeZone
import org.jetbrains.exposed.sql.json.jsonb

private val testRunJsonFormat = Json { ignoreUnknownKeys = true }

private fun testExecutionResultListSerialize(value: List<TestExecutionResult>): String =
    testRunJsonFormat.encodeToString(ListSerializer(TestExecutionResult.serializer()), value)

private fun testExecutionResultListDeserialize(value: String): List<TestExecutionResult> =
    testRunJsonFormat.decodeFromString(ListSerializer(TestExecutionResult.serializer()), value)

object TestRunsTable : Table("test_runs") {
    val owner = varchar("owner", 255).default("public")
    val id = varchar("id", 255)
    val adlId = varchar("adl_id", 255)
    val requestedTestCaseId = varchar("requested_test_case_id", 255).nullable()
    val overallScore = double("overall_score")
    val results = jsonb("results", ::testExecutionResultListSerialize, ::testExecutionResultListDeserialize)
    val createdAt = timestampWithTimeZone("created_at")

    override val primaryKey = PrimaryKey(owner, id)

    init {
        index(false, owner, adlId, createdAt)
        foreignKey(owner, adlId, target = AdlsTable.primaryKey)
    }
}

