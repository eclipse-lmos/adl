// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import dev.langchain4j.data.document.Metadata
import dev.langchain4j.data.segment.TextSegment
import dev.langchain4j.model.embedding.EmbeddingModel
import dev.langchain4j.store.embedding.EmbeddingSearchRequest
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore
import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.SimpleMessage
import org.eclipse.lmos.adl.server.repositories.SearchResult
import org.eclipse.lmos.adl.server.repositories.UseCaseEmbeddingsRepository
import org.eclipse.lmos.arc.assistants.support.usecases.toUseCases
import java.util.concurrent.ConcurrentHashMap

class InMemoryUseCaseEmbeddingsStore(
    private val embeddingModel: EmbeddingModel
) : UseCaseEmbeddingsRepository {

    private val store = InMemoryEmbeddingStore<TextSegment>()

    // Manage mapping of UseCaseId to embedding IDs in the store
    private val useCaseIdToEmbeddingIds = ConcurrentHashMap<String, MutableList<String>>()

    override suspend fun initialize() {
        // In-Memory does not require initialization
    }

    override suspend fun storeUtterances(id: String, examples: List<String>, tags: Set<String>): Int {
        val owner = currentOwner()
        deleteByUseCaseId(id)
        return storeExamples(id, "", examples, tags, owner)
    }

    override suspend fun storeUseCase(adl: String, examples: List<String>, tags: Set<String>): Int {
        val owner = currentOwner()
        val parsedUseCases = adl.toUseCases()
        var count = 0
        parsedUseCases.forEach { useCase ->
            deleteByUseCaseId(useCase.id)
            val allExamples = (parseExamples(useCase.examples) + examples).distinct()
            count += storeExamples(useCase.id, adl, allExamples, tags, owner)
        }
        return count
    }

    private fun storeExamples(
        useCaseId: String,
        content: String,
        examples: List<String>,
        tags: Set<String> = emptySet(),
        owner: String,
    ): Int {
        val segments = examples.map { example ->
            val metadata = mutableMapOf(
                PAYLOAD_OWNER to owner,
                PAYLOAD_USECASE_ID to useCaseId,
                PAYLOAD_EXAMPLE to example,
                PAYLOAD_CONTENT to content
            )
            if (tags.isNotEmpty()) {
                metadata[PAYLOAD_TAGS] = tags.joinToString(",")
            }

            TextSegment.from(example, Metadata.from(metadata))
        }

        if (segments.isEmpty()) return 0

        val embeddings = embeddingModel.embedAll(segments).content()
        val ids = store.addAll(embeddings, segments)

        useCaseIdToEmbeddingIds.computeIfAbsent(key(owner, useCaseId)) { mutableListOf() }.addAll(ids)

        return ids.size
    }

    override suspend fun search(
        query: String,
        limit: Int,
        scoreThreshold: Float,
        tags: Set<String>?
    ): List<SearchResult> {
        val owner = currentOwner()
        val embedding = embeddingModel.embed(query).content()
        val request = EmbeddingSearchRequest.builder()
            .queryEmbedding(embedding)
            .maxResults(limit)
            .minScore(scoreThreshold.toDouble())
            .filter { metadata ->
                if (metadata is Metadata && metadata.getString(PAYLOAD_OWNER) != owner) return@filter false
                if (tags.isNullOrEmpty()) return@filter true
                if (metadata !is Metadata) return@filter true
                val exampleTags = metadata.getString(PAYLOAD_TAGS)?.split(",")?.map { it.trim() } ?: emptyList()
                tags.all { it in exampleTags }

            }
            .build()
        val results = store.search(request).matches()

        return results.map { match ->
            SearchResult(
                adlId = match.embedded().metadata().getString(PAYLOAD_USECASE_ID) ?: "",
                example = match.embedded().metadata().getString(PAYLOAD_EXAMPLE) ?: "",
                score = match.score().toFloat(),
                content = match.embedded().metadata().getString(PAYLOAD_CONTENT) ?: ""
            )
        }
    }

    override suspend fun searchByConversation(
        messages: List<SimpleMessage>,
        limit: Int,
        scoreThreshold: Float
    ): List<SearchResult> {
        // Filter last user messages
        return messages.filter { it.role == "user" && it.content.length > 5 }
            .takeLast(5)
            .flatMap { search(it.content, limit, scoreThreshold, null) }
    }

    override suspend fun deleteByUseCaseId(useCaseId: String) {
        val ids = useCaseIdToEmbeddingIds.remove(key(currentOwner(), useCaseId))
        if (!ids.isNullOrEmpty()) {
            store.removeAll(ids)
        }
    }

    override suspend fun clear() {
        val owner = currentOwner()
        val matchingKeys = useCaseIdToEmbeddingIds.keys.filter { it.startsWith("$owner::") }
        val allIds = matchingKeys.flatMap { useCaseIdToEmbeddingIds[it].orEmpty() }
        if (allIds.isNotEmpty()) {
            store.removeAll(allIds)
            matchingKeys.forEach { useCaseIdToEmbeddingIds.remove(it) }
        }
    }

    override suspend fun count(): Long {
        val owner = currentOwner()
        return useCaseIdToEmbeddingIds.entries
            .filter { it.key.startsWith("$owner::") }
            .sumOf { it.value.size }
            .toLong()
    }

    override fun close() {
        // Nothing to do for In-Memory
    }

    private fun parseExamples(examples: String): List<String> {
        return examples.lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .map { it.removePrefix("-").trim() }
            .filter { it.isNotEmpty() }
    }

    companion object {
        private const val PAYLOAD_OWNER = "owner"
        private const val PAYLOAD_USECASE_ID = "usecase_id"
        private const val PAYLOAD_EXAMPLE = "example"
        private const val PAYLOAD_CONTENT = "content"
        private const val PAYLOAD_TAGS = "tags"
    }

    private fun key(owner: String, useCaseId: String): String = "$owner::$useCaseId"
}
