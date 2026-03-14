// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.TestRunResult
import org.eclipse.lmos.adl.server.repositories.TestRunRepository
import org.slf4j.LoggerFactory
import java.io.File
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.util.Base64

/**
 * Filesystem-backed implementation of [TestRunRepository].
 */
class FileSystemTestRunRepository(private val folder: File) : TestRunRepository {
    private val log = LoggerFactory.getLogger(FileSystemTestRunRepository::class.java)
    private val objectMapper = jacksonObjectMapper()

    init {
        if (!folder.exists()) {
            folder.mkdirs()
        }
    }

    override suspend fun save(result: TestRunResult): TestRunResult = withContext(Dispatchers.IO) {
        val scopedResult = result.copy(owner = currentOwner())
        val targetFile = fileForId(scopedResult.id, scopedResult.owner)
        targetFile.parentFile?.mkdirs()
        val tempFile = File.createTempFile(targetFile.nameWithoutExtension, ".tmp", targetFile.parentFile)

        try {
            objectMapper.writeValue(tempFile, scopedResult)
            try {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING, ATOMIC_MOVE)
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING)
            }
            scopedResult
        } catch (exception: Exception) {
            tempFile.delete()
            throw exception
        }
    }

    override suspend fun findById(id: String): TestRunResult? = withContext(Dispatchers.IO) {
        val file = fileForId(id, currentOwner())
        if (!file.exists()) {
            return@withContext null
        }

        try {
            objectMapper.readValue(file, TestRunResult::class.java)
        } catch (exception: Exception) {
            log.error("Error reading test run file for id {}", id, exception)
            null
        }
    }

    override suspend fun findByAdlId(adlId: String, limit: Int): List<TestRunResult> {
        return findAllCurrentOwner()
            .filter { it.adlId == adlId }
            .sortedByDescending { it.createdAt }
            .take(limit.coerceIn(1, MAX_LIMIT))
    }

    override suspend fun delete(id: String): Boolean = withContext(Dispatchers.IO) {
        val file = fileForId(id, currentOwner())
        file.exists() && file.delete()
    }

    override suspend fun deleteByAdlId(adlId: String): Int = withContext(Dispatchers.IO) {
        val filesToDelete = findAllCurrentOwner()
            .filter { it.adlId == adlId }
            .map { fileForId(it.id, currentOwner()) }
            .filter { it.exists() }
        filesToDelete.count { it.delete() }
    }

    private suspend fun findAllCurrentOwner(): List<TestRunResult> = withContext(Dispatchers.IO) {
        val ownerFolder = folderForOwner(currentOwner())
        ownerFolder.listFiles { _, fileName -> fileName.endsWith(FILE_EXTENSION) }
            ?.sortedBy { it.name }
            ?.mapNotNull { file ->
                try {
                    objectMapper.readValue(file, TestRunResult::class.java)
                } catch (exception: Exception) {
                    log.error("Error reading test run file {}", file.name, exception)
                    null
                }
            }
            ?: emptyList()
    }

    private fun fileForId(id: String, owner: String): File {
        return File(folderForOwner(owner), "${encodeId(id)}$FILE_EXTENSION")
    }

    private fun folderForOwner(owner: String): File {
        return if (owner == DEFAULT_OWNER) folder else File(folder, encodeId(owner)).apply { mkdirs() }
    }

    private fun encodeId(id: String): String {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(id.toByteArray(Charsets.UTF_8))
    }

    private companion object {
        const val FILE_EXTENSION = ".testrun.json"
        const val MAX_LIMIT = 100
    }
}

