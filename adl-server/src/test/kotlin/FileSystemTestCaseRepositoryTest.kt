// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server
import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.models.ConversationTurn
import org.eclipse.lmos.adl.server.models.TestCase
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemTestCaseRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
class FileSystemTestCaseRepositoryTest {
    @TempDir
    lateinit var tempDir: Path
    @Test
    fun `save and find test case by id`() = runBlocking {
        val repository = FileSystemTestCaseRepository(tempDir.toFile())
        val testCase = sampleTestCase(id = "test-1")
        val saved = repository.save(testCase)
        val loaded = repository.findById("test-1")
        assertEquals(testCase, saved)
        assertEquals(testCase, loaded)
    }
    @Test
    fun `find all and filter methods read persisted test cases from disk`() = runBlocking {
        val repository = FileSystemTestCaseRepository(tempDir.toFile())
        repository.saveAll(
            listOf(
                sampleTestCase(id = "test-1", useCaseId = "checkout", adlId = "adl-1"),
                sampleTestCase(id = "test-2", useCaseId = "checkout", adlId = "adl-2"),
                sampleTestCase(id = "test-3", useCaseId = "refund", adlId = "adl-1"),
            )
        )
        val reloadedRepository = FileSystemTestCaseRepository(tempDir.toFile())
        assertEquals(3, reloadedRepository.findAll().size)
        assertEquals(listOf("test-1", "test-2"), reloadedRepository.findByUseCaseId("checkout").map { it.id }.sorted())
        assertEquals(listOf("test-1", "test-3"), reloadedRepository.findByADLId("adl-1").map { it.id }.sorted())
    }
    @Test
    fun `delete removes persisted test case`() = runBlocking {
        val repository = FileSystemTestCaseRepository(tempDir.toFile())
        repository.save(sampleTestCase(id = "test-delete"))
        assertTrue(repository.delete("test-delete"))
        assertNull(repository.findById("test-delete"))
        assertFalse(repository.delete("test-delete"))
    }
    @Test
    fun `ids with path separators are stored safely`() = runBlocking {
        val repository = FileSystemTestCaseRepository(tempDir.toFile())
        val testCase = sampleTestCase(id = "folder/test case")
        repository.save(testCase)
        assertEquals(testCase, repository.findById("folder/test case"))
        assertEquals(1, tempDir.toFile().listFiles { _, name -> name.endsWith(".json") }?.size)
    }
    private fun sampleTestCase(
        id: String,
        useCaseId: String = "use-case-1",
        adlId: String = "adl-1",
    ) = TestCase(
        id = id,
        useCaseId = useCaseId,
        adlId = adlId,
        name = "Sample test",
        description = "Sample description",
        expectedConversation = listOf(
            ConversationTurn(role = "user", content = "Hello"),
            ConversationTurn(role = "assistant", content = "Hi there")
        ),
        variants = listOf(
            listOf(
                ConversationTurn(role = "user", content = "Hey"),
                ConversationTurn(role = "assistant", content = "Hello")
            )
        ),
        contract = true,
    )
}
