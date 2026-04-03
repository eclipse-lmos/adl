// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.TestCase
import org.eclipse.lmos.adl.server.repositories.TestCaseRepository
import org.slf4j.LoggerFactory
import java.io.File
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.util.Base64

/**
 * Filesystem-backed implementation of [TestCaseRepository].
 */
class FileSystemTestCaseRepository(private val folder: File) : TestCaseRepository {
    private val log = LoggerFactory.getLogger(FileSystemTestCaseRepository::class.java)
    private val objectMapper = jacksonObjectMapper()

    init {
        if (!folder.exists()) {
            folder.mkdirs()
        }
    }

    override suspend fun save(testCase: TestCase): TestCase = withContext(Dispatchers.IO) {
        val scopedTestCase = testCase.copy(owner = currentOwner())
        val targetFile = fileForId(scopedTestCase.id, scopedTestCase.owner)
        targetFile.parentFile?.mkdirs()
        val tempFile = File.createTempFile(targetFile.nameWithoutExtension, ".tmp", targetFile.parentFile)

        try {
            objectMapper.writeValue(tempFile, scopedTestCase)
            try {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING, ATOMIC_MOVE)
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING)
            }
            scopedTestCase
        } catch (exception: Exception) {
            tempFile.delete()
            throw exception
        }
    }

    override suspend fun saveAll(testCases: List<TestCase>): List<TestCase> {
        testCases.forEach { save(it) }
        return testCases
    }

    override suspend fun findById(id: String): TestCase? = withContext(Dispatchers.IO) {
        val file = fileForId(id, currentOwner())
        if (!file.exists()) {
            return@withContext null
        }

        try {
            objectMapper.readValue(file, TestCase::class.java)
        } catch (exception: Exception) {
            log.error("Error reading test case file for id {}", id, exception)
            null
        }
    }

    override suspend fun findAll(): List<TestCase> = withContext(Dispatchers.IO) {
        val ownerFolder = folderForOwner(currentOwner())
        ownerFolder.listFiles { _, fileName -> fileName.endsWith(FILE_EXTENSION) }
            ?.sortedBy { it.name }
            ?.mapNotNull { file ->
                try {
                    objectMapper.readValue(file, TestCase::class.java)
                } catch (exception: Exception) {
                    log.error("Error reading test case file {}", file.name, exception)
                    null
                }
            }
            ?: emptyList()
    }

    override suspend fun findByUseCaseId(useCaseId: String): List<TestCase> {
        return findAll().filter { it.useCaseId == useCaseId }
    }

    override suspend fun findByADLId(adlId: String): List<TestCase> {
        return findAll().filter { it.adlId == adlId }
    }

    override suspend fun delete(id: String): Boolean = withContext(Dispatchers.IO) {
        val file = fileForId(id, currentOwner())
        file.exists() && file.delete()
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
        const val FILE_EXTENSION = ".test.json"
    }
}

