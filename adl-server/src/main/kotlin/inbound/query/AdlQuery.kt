// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.query

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Query
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.models.AdlDiff
import org.eclipse.lmos.adl.server.models.AdlVersion
import org.eclipse.lmos.adl.server.models.SimpleMessage
import org.eclipse.lmos.adl.server.repositories.AdlRepository
import org.eclipse.lmos.adl.server.repositories.UseCaseEmbeddingsRepository
import org.eclipse.lmos.adl.server.repositories.SearchResult

/**
 * GraphQL Query for searching UseCases based on conversation embeddings.
 */
class AdlQuery(
    private val useCaseStore: UseCaseEmbeddingsRepository,
    private val adlStorage: AdlRepository,
) : Query {

    @GraphQLDescription("Returns the supported version of the ALD.")
    fun version(): String {
        return "1.0.0"
    }

    @GraphQLDescription("Returns the UseCase IDs that match the conversation provided, ordered by relevance.")
    suspend fun search(
        conversation: List<SimpleMessage>,
        @GraphQLDescription("Maximum number of results to return") limit: Int? = null,
        @GraphQLDescription("Minimum similarity score (0.0 to 1.0)") scoreThreshold: Double? = 0.0,
    ): List<UseCaseMatch> {
        if (limit != null) require(limit in 1..100) { "limit must be between 1 and 100" }
        if (scoreThreshold != null) require(scoreThreshold in 0.0f..1.0f) { "scoreThreshold must be between 0.0 and 1.0" }
        require(conversation.isNotEmpty()) { "conversation must not be empty" }
        val results = useCaseStore.searchByConversation(conversation, limit ?: 10, scoreThreshold?.toFloat() ?: 0.0f)
        return results.toMatches()
    }

    @GraphQLDescription("Returns a list of all stored ADLs.")
    suspend fun list(
        @GraphQLDescription("Optional search criteria to filter ADLs by relevance") searchTerm: SearchCriteria? = null,
    ): List<Adl> {
        val allAdls = adlStorage.list()
        if (searchTerm == null || searchTerm.term.isBlank()) {
            return allAdls
        }
        val matches = useCaseStore.search(searchTerm.term, searchTerm.limit, searchTerm.threshold.toFloat(), searchTerm.tags?.toSet())
        val scores = matches.groupBy { it.adlId }.mapValues { it.value.maxOf { match -> match.score } }

        return allAdls.filter { it.id in scores.keys }
            .map { it.copy(relevance = scores[it.id]?.toDouble()) }
            .sortedByDescending { it.relevance }
    }

    @GraphQLDescription("Returns a single ADL by ID.")
    suspend fun searchById(@GraphQLDescription("The ID of the ADL") id: String): Adl? {
        return adlStorage.get(id)
    }

    @GraphQLDescription("Searches for UseCases using a text query.")
    suspend fun searchByText(
        query: String,
        @GraphQLDescription("Maximum number of results to return") limit: Int? = null,
        @GraphQLDescription("Minimum similarity score (0.0 to 1.0)") scoreThreshold: Double? = 0.0,
        @GraphQLDescription("Tags to filter by") tags: List<String>? = null,
    ): List<UseCaseMatch> {
        if (limit != null) require(limit in 1..100) { "limit must be between 1 and 100" }
        if (scoreThreshold != null) require(scoreThreshold in 0.0f..1.0f) { "scoreThreshold must be between 0.0 and 1.0" }
        require(query.isNotBlank()) { "query must not be blank" }
        val results = useCaseStore.search(query, limit ?: 10, scoreThreshold?.toFloat() ?: 0.0f, tags?.toSet())
        return results.toMatches()
    }

    @GraphQLDescription("Returns the version history of an ADL.")
    suspend fun versionHistory(
        @GraphQLDescription("The ID of the ADL") id: String,
    ): List<AdlVersion> {
        return adlStorage.getVersionHistory(id)
    }

    @GraphQLDescription("Returns a specific version of an ADL.")
    suspend fun getVersion(
        @GraphQLDescription("The ID of the ADL") id: String,
        @GraphQLDescription("The version number") version: Int,
    ): AdlVersion? {
        return adlStorage.getVersion(id, version)
    }

    @GraphQLDescription("Returns a diff between two versions of an ADL.")
    suspend fun diffVersions(
        @GraphQLDescription("The ID of the ADL") id: String,
        @GraphQLDescription("The source version number") fromVersion: Int,
        @GraphQLDescription("The target version number") toVersion: Int,
    ): AdlDiff {
        val fromContent = resolveVersionContent(id, fromVersion)
        val toContent = resolveVersionContent(id, toVersion)
        val diff = computeUnifiedDiff(fromContent, toContent, fromVersion, toVersion)
        return AdlDiff(adlId = id, fromVersion = fromVersion, toVersion = toVersion, contentDiff = diff)
    }

    private suspend fun resolveVersionContent(id: String, version: Int): String {
        // Check if this is the current version
        val current = adlStorage.get(id)
        if (current != null && current.version.toIntOrNull() == version) {
            return current.content
        }
        return adlStorage.getVersion(id, version)?.content
            ?: throw IllegalArgumentException("Version $version not found for ADL $id")
    }

    private fun computeUnifiedDiff(from: String, to: String, fromVersion: Int, toVersion: Int): String {
        val fromLines = from.lines()
        val toLines = to.lines()

        // Simple line-based diff using longest common subsequence
        val lcs = lcs(fromLines, toLines)
        val result = StringBuilder()
        result.appendLine("--- v$fromVersion")
        result.appendLine("+++ v$toVersion")

        var fromIdx = 0
        var toIdx = 0
        var lcsIdx = 0

        while (fromIdx < fromLines.size || toIdx < toLines.size) {
            if (lcsIdx < lcs.size && fromIdx < fromLines.size && toIdx < toLines.size &&
                fromLines[fromIdx] == lcs[lcsIdx] && toLines[toIdx] == lcs[lcsIdx]
            ) {
                result.appendLine(" ${fromLines[fromIdx]}")
                fromIdx++
                toIdx++
                lcsIdx++
            } else {
                if (fromIdx < fromLines.size && (lcsIdx >= lcs.size || fromLines[fromIdx] != lcs[lcsIdx])) {
                    result.appendLine("-${fromLines[fromIdx]}")
                    fromIdx++
                }
                if (toIdx < toLines.size && (lcsIdx >= lcs.size || toLines[toIdx] != lcs[lcsIdx])) {
                    result.appendLine("+${toLines[toIdx]}")
                    toIdx++
                }
            }
        }
        return result.toString().trimEnd()
    }

    private fun lcs(a: List<String>, b: List<String>): List<String> {
        val dp = Array(a.size + 1) { IntArray(b.size + 1) }
        for (i in a.indices) {
            for (j in b.indices) {
                dp[i + 1][j + 1] = if (a[i] == b[j]) dp[i][j] + 1 else maxOf(dp[i + 1][j], dp[i][j + 1])
            }
        }
        val result = mutableListOf<String>()
        var i = a.size
        var j = b.size
        while (i > 0 && j > 0) {
            when {
                a[i - 1] == b[j - 1] -> { result.add(a[i - 1]); i--; j-- }
                dp[i - 1][j] > dp[i][j - 1] -> i--
                else -> j--
            }
        }
        return result.reversed()
    }

    private fun List<SearchResult>.toMatches(): List<UseCaseMatch> {
        return groupBy { it.adlId }
            .map { (useCaseId, matches) ->
                UseCaseMatch(
                    maxScore = matches.maxOf { it.score },
                    useCaseId = useCaseId,
                    matchedExamples = matches.map { Example(it.score, it.example) },
                    content = matches.first().content,
                )
            }
            .sortedByDescending { it.maxScore }
    }
}

/**
 * Represents a matched UseCase with its relevance score.
 */
@GraphQLDescription("A UseCase match result with relevance score")
data class UseCaseMatch(
    @param:GraphQLDescription("The ID of the matched UseCase")
    val useCaseId: String,
    @param:GraphQLDescription("The UseCase content")
    val content: String,
    @param:GraphQLDescription("The max similarity score (0.0 to 1.0)")
    val maxScore: Float,
    @param:GraphQLDescription("The examples that matched the query")
    val matchedExamples: List<Example>,
)

@GraphQLDescription("A UseCase match result with relevance score")
data class Example(
    @param:GraphQLDescription("The similarity score (0.0 to 1.0)")
    val score: Float,
    @param:GraphQLDescription("The examples that matched the query")
    val example: String,
)

@GraphQLDescription("Search criteria for ADLs")
data class SearchCriteria(
    @param:GraphQLDescription("The search term")
    val term: String,
    @param:GraphQLDescription("Maximum number of results to return")
    val limit: Int = 50,
    @param:GraphQLDescription("Minimum similarity score (0.0 to 1.0)")
    val threshold: Double = 0.5,
    @param:GraphQLDescription("Tags to filter by")
    val tags: List<String>? = null,
)
