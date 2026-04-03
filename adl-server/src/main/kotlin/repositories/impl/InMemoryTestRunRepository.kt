// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.TestRunResult
import org.eclipse.lmos.adl.server.repositories.TestRunRepository
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory implementation of [TestRunRepository].
 */
class InMemoryTestRunRepository : TestRunRepository {
    private val store = ConcurrentHashMap<String, TestRunResult>()

    override suspend fun save(result: TestRunResult): TestRunResult {
        val scopedResult = result.copy(owner = currentOwner())
        store[key(scopedResult.owner, scopedResult.id)] = scopedResult
        return scopedResult
    }

    override suspend fun findById(id: String): TestRunResult? {
        return store[key(currentOwner(), id)]
    }

    override suspend fun findByAdlId(adlId: String, limit: Int): List<TestRunResult> {
        val owner = currentOwner()
        return store.values
            .asSequence()
            .filter { it.owner == owner && it.adlId == adlId }
            .sortedByDescending { it.createdAt }
            .take(limit.coerceIn(1, MAX_LIMIT))
            .toList()
    }

    override suspend fun delete(id: String): Boolean {
        return store.remove(key(currentOwner(), id)) != null
    }

    override suspend fun deleteByAdlId(adlId: String): Int {
        val owner = currentOwner()
        val keysToRemove = store.entries
            .filter { (_, value) -> value.owner == owner && value.adlId == adlId }
            .map { it.key }
        keysToRemove.forEach(store::remove)
        return keysToRemove.size
    }

    private fun key(owner: String, id: String): String = "$owner::$id"

    private companion object {
        const val MAX_LIMIT = 100
    }
}

