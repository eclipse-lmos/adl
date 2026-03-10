// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import org.eclipse.lmos.adl.server.models.Widget
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemWidgetRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class FileSystemWidgetRepositoryTest {

    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `save and find widget by id`() {
        val repository = FileSystemWidgetRepository(tempDir.toFile())
        val widget = sampleWidget(id = "widget-1", name = "Weather")

        val saved = repository.save(widget)
        val loaded = repository.findById("widget-1")

        assertEquals(widget, saved)
        assertEquals(widget, loaded)
    }

    @Test
    fun `find all and find by name read persisted widgets from disk`() {
        val repository = FileSystemWidgetRepository(tempDir.toFile())
        repository.save(sampleWidget(id = "widget-1", name = "Weather"))
        repository.save(sampleWidget(id = "widget-2", name = "Weather", html = "<div>Two</div>"))
        repository.save(sampleWidget(id = "widget-3", name = "Stocks"))

        val reloadedRepository = FileSystemWidgetRepository(tempDir.toFile())

        assertEquals(3, reloadedRepository.findAll().size)
        assertEquals(listOf("widget-1", "widget-2"), reloadedRepository.findByName("Weather").map { it.id }.sorted())
    }

    @Test
    fun `delete removes persisted widget`() {
        val repository = FileSystemWidgetRepository(tempDir.toFile())
        repository.save(sampleWidget(id = "widget-delete", name = "Delete me"))

        assertTrue(repository.delete("widget-delete"))
        assertNull(repository.findById("widget-delete"))
        assertFalse(repository.delete("widget-delete"))
    }

    @Test
    fun `ids with path separators are stored safely`() {
        val repository = FileSystemWidgetRepository(tempDir.toFile())
        val widget = sampleWidget(id = "folder/widget with spaces", name = "Safe")

        repository.save(widget)

        assertEquals(widget, repository.findById("folder/widget with spaces"))
        assertEquals(1, tempDir.toFile().listFiles { _, name -> name.endsWith(".json") }?.size)
    }

    private fun sampleWidget(
        id: String,
        name: String,
        html: String = "<div>Hello</div>",
    ) = Widget(
        id = id,
        name = name,
        description = "Sample widget",
        html = html,
        jsonSchema = "{\"type\":\"object\"}",
        preview = "preview-data"
    )
}

