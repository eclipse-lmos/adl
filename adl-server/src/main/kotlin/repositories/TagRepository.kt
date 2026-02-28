// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories

/**
 * Interface for managing tags used in ADLs.
 */
interface TagRepository {
    suspend fun save(tag: String)
    suspend fun saveAll(tags: Collection<String>)
    suspend fun list(): List<String>
    suspend fun delete(tag: String)
}

