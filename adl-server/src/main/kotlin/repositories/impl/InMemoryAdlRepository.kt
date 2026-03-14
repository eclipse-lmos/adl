// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.repositories.AdlRepository
import org.eclipse.lmos.adl.server.model.Adl
import java.util.concurrent.ConcurrentHashMap

class InMemoryAdlRepository : AdlRepository {
    private val storage = ConcurrentHashMap<String, Adl>()

    override suspend fun store(adl: Adl): Adl {
        val scopedAdl = adl.copy(owner = currentOwner())
        storage[key(scopedAdl.owner, scopedAdl.id)] = scopedAdl
        return scopedAdl
    }

    override suspend fun get(id: String): Adl? {
        return storage[key(currentOwner(), id)]
    }

    override suspend fun list(): List<Adl> {
        val owner = currentOwner()
        return storage.values.filter { it.owner == owner }
    }

    override suspend fun deleteById(id: String) {
        storage.remove(key(currentOwner(), id))
    }

    private fun key(owner: String, id: String): String = "$owner::$id"
}