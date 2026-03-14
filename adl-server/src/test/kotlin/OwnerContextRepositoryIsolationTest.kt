// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.models.UserSettings
import org.eclipse.lmos.adl.server.models.Widget
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAdlRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryUserSettingsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryWidgetRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class OwnerContextRepositoryIsolationTest {

    @Test
    fun `current owner defaults to public and coroutine owner is restored after block`() = runBlocking {
        assertEquals(DEFAULT_OWNER, currentOwner())

        withOwner("alice") {
            assertEquals("alice", currentOwner())
        }

        assertEquals(DEFAULT_OWNER, currentOwner())
    }

    @Test
    fun `widget repository isolates data by owner from context`() {
        val repository = InMemoryWidgetRepository()

        val publicWidget = repository.save(sampleWidget(id = "shared-id", name = "Public"))
        val aliceWidget = withOwnerBlocking("alice") {
            repository.save(sampleWidget(id = "shared-id", name = "Alice"))
        }

        assertEquals(DEFAULT_OWNER, publicWidget.owner)
        assertEquals("alice", aliceWidget.owner)
        assertEquals("Public", repository.findById("shared-id")?.name)
        assertEquals("Alice", withOwnerBlocking("alice") { repository.findById("shared-id")?.name })
    }

    @Test
    fun `suspend repositories isolate data by owner from coroutine context`() = runBlocking {
        val adlRepository = InMemoryAdlRepository()
        val userSettingsRepository = InMemoryUserSettingsRepository()

        adlRepository.store(sampleAdl(id = "adl-1", content = "public"))
        userSettingsRepository.save(UserSettings(apiKey = "public-key", modelName = "gpt-4.1"))

        withOwner("alice") {
            adlRepository.store(sampleAdl(id = "adl-1", content = "alice"))
            userSettingsRepository.save(UserSettings(apiKey = "alice-key", modelName = "gpt-4.1-mini"))

            assertEquals("alice", adlRepository.get("adl-1")?.content)
            assertEquals("alice-key", userSettingsRepository.get()?.apiKey)
        }

        assertEquals("public", adlRepository.get("adl-1")?.content)
        assertEquals("public-key", userSettingsRepository.get()?.apiKey)
        assertNull(withOwnerBlocking("bob") { null })
    }

    private fun sampleWidget(id: String, name: String) = Widget(
        id = id,
        name = name,
        description = "Sample widget",
        html = "<div>Hello</div>",
        jsonSchema = "{\"type\":\"object\"}",
        preview = "preview-data",
    )

    private fun sampleAdl(id: String, content: String) = Adl(
        id = id,
        content = content,
        tags = listOf("tag"),
        createdAt = "2024-01-01T00:00:00Z",
    )
}

