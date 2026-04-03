// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories

import org.eclipse.lmos.adl.server.models.TestRunResult

/**
 * Repository for managing persisted [TestRunResult] entities.
 */
interface TestRunRepository {
    /**
     * Persists a [result] and returns the stored representation.
     */
    suspend fun save(result: TestRunResult): TestRunResult

    /**
     * Finds a persisted test run by its [id] within the current owner scope.
     */
    suspend fun findById(id: String): TestRunResult?

    /**
     * Lists persisted test runs for an ADL within the current owner scope.
     */
    suspend fun findByAdlId(adlId: String, limit: Int = 20): List<TestRunResult>

    /**
     * Deletes a persisted test run by its [id] within the current owner scope.
     */
    suspend fun delete(id: String): Boolean

    /**
     * Deletes all persisted test runs for an [adlId] within the current owner scope.
     */
    suspend fun deleteByAdlId(adlId: String): Int
}

