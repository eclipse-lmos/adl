// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.models

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import kotlinx.serialization.Serializable
import org.eclipse.lmos.adl.server.DEFAULT_OWNER

/**
 * Result of a test suite execution.
 */
@Serializable
@GraphQLDescription("Result of a test suite execution")
data class TestRunResult(
    @param:GraphQLDescription("The persisted identifier of the test run")
    val id: String = "",
    @param:GraphQLDescription("The ADL identifier that was executed")
    val adlId: String = "",
    @param:GraphQLDescription("The owner scope that owns this test run")
    val owner: String = DEFAULT_OWNER,
    @param:GraphQLDescription("The ISO-8601 timestamp when the test run was created")
    val createdAt: String = "",
    @param:GraphQLDescription("The requested test case id when a single test case run was requested")
    val requestedTestCaseId: String? = null,
    @param:GraphQLDescription("The overall score of the test suite (0-100)")
    val overallScore: Double,
    @param:GraphQLDescription("The results of individual test cases")
    val results: List<TestExecutionResult>,
)
