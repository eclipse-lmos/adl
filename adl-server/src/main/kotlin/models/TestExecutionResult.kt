// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.models

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import kotlinx.serialization.Serializable
import org.eclipse.lmos.adl.server.agents.EvalOutput

/**
 * Result of a test execution.
 */
@Serializable
@GraphQLDescription("Result of a test execution")
data class TestExecutionResult(
    @param:GraphQLDescription("The ID of the test case")
    val testCaseId: String,
    @param:GraphQLDescription("The Name of the test case")
    val testCaseName: String,
    @param:GraphQLDescription("The status of the test execution (PASS/FAIL)")
    val status: String,
    @param:GraphQLDescription("The evaluation score")
    val score: Int,
    @param:GraphQLDescription("The stored snapshot of the executed test case")
    val testCase: TestCase,
    @param:GraphQLDescription("The index of the executed conversation variant")
    val executedVariantIndex: Int? = null,
    @param:GraphQLDescription("The concrete conversation turns that were executed")
    val executedConversation: List<ConversationTurn> = emptyList(),
    @param:GraphQLDescription("The actual conversation that took place")
    val actualConversation: List<ConversationTurn>,
    @param:GraphQLDescription("The use cases involved in the test execution")
    val useCases: List<String>,
    @param:GraphQLDescription("Detailed evaluation output")
    val details: EvalOutput,
    @param:GraphQLDescription("The failure reason when execution did not complete successfully")
    val failureReason: String? = null,
)
