// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.UserSettings
import org.eclipse.lmos.adl.server.repositories.UserSettingsRepository
import java.util.concurrent.ConcurrentHashMap

class InMemoryUserSettingsRepository : UserSettingsRepository {
    private val storage = ConcurrentHashMap<String, UserSettings>()

    override suspend fun save(settings: UserSettings): UserSettings {
        val scopedSettings = settings.copy(owner = currentOwner())
        storage[scopedSettings.owner] = scopedSettings
        return scopedSettings
    }

    override suspend fun get(): UserSettings? {
        return storage[currentOwner()]
    }
}

