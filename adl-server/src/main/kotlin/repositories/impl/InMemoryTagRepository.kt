// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.repositories.TagRepository
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory implementation of [TagRepository].
 */
class InMemoryTagRepository : TagRepository {
    private val store = ConcurrentHashMap<String, MutableSet<String>>()

    override suspend fun save(tag: String) {
        if (tag.isNotBlank()) {
            store.computeIfAbsent(currentOwner()) { ConcurrentHashMap.newKeySet() }.add(tag.trim())
        }
    }

    override suspend fun saveAll(tags: Collection<String>) {
        store.computeIfAbsent(currentOwner()) { ConcurrentHashMap.newKeySet() }
            .addAll(tags.filter { it.isNotBlank() }.map { it.trim() })
    }

    override suspend fun list(): List<String> {
        return store[currentOwner()]?.toList()?.sorted() ?: emptyList()
    }

    override suspend fun delete(tag: String) {
        store[currentOwner()]?.remove(tag)
    }
}

