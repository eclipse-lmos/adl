// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.repositories.StatisticsRepository
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

class InMemoryStatisticsRepository : StatisticsRepository {

    private val useCaseCounts = ConcurrentHashMap<String, ConcurrentHashMap<String, AtomicLong>>()
    private val useCaseComplianceScores = ConcurrentHashMap<String, ConcurrentHashMap<String, MutableList<Int>>>()
    private val totalResponseTimeMillis = ConcurrentHashMap<String, AtomicLong>()
    private val requestCount = ConcurrentHashMap<String, AtomicLong>()

    override suspend fun incrementUseCaseCount(useCaseId: String) {
        val owner = currentOwner()
        useCaseCounts.computeIfAbsent(owner) { ConcurrentHashMap() }
            .computeIfAbsent(useCaseId) { AtomicLong(0) }
            .incrementAndGet()
    }

    override suspend fun recordResponseTime(duration: Duration) {
        val owner = currentOwner()
        totalResponseTimeMillis.computeIfAbsent(owner) { AtomicLong(0) }.addAndGet(duration.toMillis())
        requestCount.computeIfAbsent(owner) { AtomicLong(0) }.incrementAndGet()
    }

    override suspend fun recordComplianceScore(useCaseId: String, score: Int) {
        val owner = currentOwner()
        useCaseComplianceScores.computeIfAbsent(owner) { ConcurrentHashMap() }
            .computeIfAbsent(useCaseId) { java.util.Collections.synchronizedList(ArrayList()) }
            .add(score)
    }

    override suspend fun getMostUsedUseCase(): List<Pair<String, Int>> {
        return useCaseCounts[currentOwner()].orEmpty().entries
            .map { (key, value) -> key to value.get().toInt() }
            .sortedByDescending { it.second }
    }

    override suspend fun getAverageResponseTime(): Double {
        val owner = currentOwner()
        val count = requestCount[owner]?.get() ?: 0
        return if (count > 0) {
            (totalResponseTimeMillis[owner]?.get() ?: 0).toDouble() / count
        } else {
            0.0
        }
    }

    override suspend fun getComplianceScores(useCaseId: String): Pair<Int, Int>? {
        val scores = useCaseComplianceScores[currentOwner()]?.get(useCaseId) ?: return null
        synchronized(scores) {
            if (scores.isEmpty()) return null
            return scores.min() to scores.max()
        }
    }

    override suspend fun clear() {
        val owner = currentOwner()
        useCaseCounts.remove(owner)
        useCaseComplianceScores.remove(owner)
        totalResponseTimeMillis.remove(owner)
        requestCount.remove(owner)
    }
}
