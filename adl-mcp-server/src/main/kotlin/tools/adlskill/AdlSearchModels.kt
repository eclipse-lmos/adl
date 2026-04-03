// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AdlSearchRequest(
    val query: String,
    val variables: AdlSearchVariables,
)

@Serializable
data class AdlSearchVariables(
    val query: String,
)

@Serializable
data class GraphQlEnvelope<T>(
    val data: T? = null,
    val errors: List<GraphQlError>? = null,
)

@Serializable
data class GraphQlError(
    val message: String? = null,
)

@Serializable
data class SearchByTextData(
    @SerialName("searchByText")
    val searchByText: List<UseCaseMatchPayload>? = null,
)

@Serializable
data class UseCaseMatchPayload(
    val useCaseId: String,
    val content: String,
    val maxScore: Double,
    val matchedExamples: List<MatchedExamplePayload>? = null,
)

@Serializable
data class MatchedExamplePayload(
    val score: Double,
    val example: String,
)