// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.repositories.TestCaseRepository
import org.eclipse.lmos.adl.server.models.TestCase
import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory implementation of [TestCaseRepository].
 */
class InMemoryTestCaseRepository : TestCaseRepository {
    private val store = ConcurrentHashMap<String, TestCase>()

    override suspend fun save(testCase: TestCase): TestCase {
        val scopedTestCase = testCase.copy(owner = currentOwner())
        store[key(scopedTestCase.owner, scopedTestCase.id)] = scopedTestCase
        return scopedTestCase
    }

    override suspend fun saveAll(testCases: List<TestCase>): List<TestCase> {
        return testCases.map { save(it) }
    }

    override suspend fun findById(id: String): TestCase? {
        return store[key(currentOwner(), id)]
    }

    override suspend fun findAll(): List<TestCase> {
        val owner = currentOwner()
        return store.values.filter { it.owner == owner }
    }

    override suspend fun findByUseCaseId(useCaseId: String): List<TestCase> {
        val owner = currentOwner()
        return store.values.filter { it.owner == owner && it.useCaseId == useCaseId }
    }

    override suspend fun findByADLId(adlId: String): List<TestCase> {
        val owner = currentOwner()
        return store.values.filter { it.owner == owner && it.adlId == adlId }
    }

    override suspend fun delete(id: String): Boolean {
        return store.remove(key(currentOwner(), id)) != null
    }

    private fun key(owner: String, id: String): String = "$owner::$id"
}
