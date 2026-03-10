// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.eclipse.lmos.adl.server.models.Widget
import org.eclipse.lmos.adl.server.repositories.WidgetRepository
import org.slf4j.LoggerFactory
import java.io.File
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.util.Base64

class FileSystemWidgetRepository(private val folder: File) : WidgetRepository {
    private val log = LoggerFactory.getLogger(FileSystemWidgetRepository::class.java)
    private val objectMapper = jacksonObjectMapper()

    init {
        if (!folder.exists()) {
            folder.mkdirs()
        }
    }

    override fun save(widget: Widget): Widget {
        val targetFile = fileForId(widget.id)
        val tempFile = File.createTempFile(targetFile.nameWithoutExtension, ".tmp", folder)

        return try {
            objectMapper.writeValue(tempFile, widget)
            try {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING, ATOMIC_MOVE)
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING)
            }
            widget
        } catch (exception: Exception) {
            tempFile.delete()
            throw exception
        }
    }

    override fun findById(id: String): Widget? {
        val file = fileForId(id)
        if (!file.exists()) {
            return null
        }

        return try {
            objectMapper.readValue(file, Widget::class.java)
        } catch (exception: Exception) {
            log.error("Error reading widget file for id {}", id, exception)
            null
        }
    }

    override fun findByName(name: String): List<Widget> {
        return findAll().filter { it.name == name }
    }

    override fun findAll(): List<Widget> {
        return folder.listFiles { _, fileName -> fileName.endsWith(FILE_EXTENSION) }
            ?.sortedBy { it.name }
            ?.mapNotNull { file ->
                try {
                    objectMapper.readValue(file, Widget::class.java)
                } catch (exception: Exception) {
                    log.error("Error reading widget file {}", file.name, exception)
                    null
                }
            }
            ?: emptyList()
    }

    override fun delete(id: String): Boolean {
        val file = fileForId(id)
        return file.exists() && file.delete()
    }

    private fun fileForId(id: String): File {
        return File(folder, "${encodeId(id)}$FILE_EXTENSION")
    }

    private fun encodeId(id: String): String {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(id.toByteArray(Charsets.UTF_8))
    }

    private companion object {
        const val FILE_EXTENSION = ".json"
    }
}

