// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server

import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.agents.EvalOutput
import org.eclipse.lmos.adl.server.models.ConversationTurn
import org.eclipse.lmos.adl.server.models.TestCase
import org.eclipse.lmos.adl.server.models.TestExecutionResult
import org.eclipse.lmos.adl.server.models.TestRunResult
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemTestRunRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class FileSystemTestRunRepositoryTest {
    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `save and find test run by id`() = runBlocking {
        val repository = FileSystemTestRunRepository(tempDir.toFile())
        val testRun = sampleTestRun(id = "run-1")

        val saved = repository.save(testRun)
        val loaded = repository.findById("run-1")

        assertEquals(testRun, saved)
        assertEquals(testRun, loaded)
    }

    @Test
    fun `find by adl id returns newest runs first and respects limit`() = runBlocking {
        val repository = FileSystemTestRunRepository(tempDir.toFile())
        repository.saveAll(
            listOf(
                sampleTestRun(id = "run-1", adlId = "adl-1", createdAt = "2026-03-14T10:00:00Z"),
                sampleTestRun(id = "run-2", adlId = "adl-1", createdAt = "2026-03-14T11:00:00Z"),
                sampleTestRun(id = "run-3", adlId = "adl-2", createdAt = "2026-03-14T12:00:00Z"),
            )
        )

        val reloadedRepository = FileSystemTestRunRepository(tempDir.toFile())
        val runs = reloadedRepository.findByAdlId("adl-1", limit = 1)

        assertEquals(listOf("run-2"), runs.map { it.id })
    }

    @Test
    fun `delete removes persisted test run`() = runBlocking {
        val repository = FileSystemTestRunRepository(tempDir.toFile())
        repository.save(sampleTestRun(id = "run-delete"))

        assertTrue(repository.delete("run-delete"))
        assertNull(repository.findById("run-delete"))
        assertFalse(repository.delete("run-delete"))
    }

    @Test
    fun `delete by adl id removes all matching persisted test runs`() = runBlocking {
        val repository = FileSystemTestRunRepository(tempDir.toFile())
        repository.save(sampleTestRun(id = "run-1", adlId = "adl-1"))
        repository.save(sampleTestRun(id = "run-2", adlId = "adl-1"))
        repository.save(sampleTestRun(id = "run-3", adlId = "adl-2"))

        val deletedCount = repository.deleteByAdlId("adl-1")

        assertEquals(2, deletedCount)
        assertNull(repository.findById("run-1"))
        assertNull(repository.findById("run-2"))
        assertEquals("run-3", repository.findById("run-3")?.id)
    }

    @Test
    fun `ids with path separators are stored safely`() = runBlocking {
        val repository = FileSystemTestRunRepository(tempDir.toFile())
        val testRun = sampleTestRun(id = "folder/test run")

        repository.save(testRun)

        assertEquals(testRun, repository.findById("folder/test run"))
        assertEquals(1, tempDir.toFile().listFiles { _, name -> name.endsWith(".json") }?.size)
    }

    private suspend fun FileSystemTestRunRepository.saveAll(testRuns: List<TestRunResult>) {
        testRuns.forEach { save(it) }
    }

    private fun sampleTestRun(
        id: String,
        adlId: String = "adl-1",
        createdAt: String = "2026-03-14T10:00:00Z",
    ) = TestRunResult(
        id = id,
        adlId = adlId,
        createdAt = createdAt,
        overallScore = 88.0,
        results = listOf(
            TestExecutionResult(
                testCaseId = "test-1",
                testCaseName = "Sample Test",
                status = "PASS",
                score = 88,
                testCase = TestCase(
                    id = "test-1",
                    useCaseId = "use-case-1",
                    adlId = adlId,
                    name = "Sample Test",
                    description = "Sample description",
                    expectedConversation = listOf(
                        ConversationTurn(role = "user", content = "Hello"),
                        ConversationTurn(role = "assistant", content = "Hi there"),
                    ),
                ),
                executedVariantIndex = 0,
                executedConversation = listOf(ConversationTurn(role = "user", content = "Hello")),
                actualConversation = listOf(
                    ConversationTurn(role = "user", content = "Hello"),
                    ConversationTurn(role = "assistant", content = "Hi there"),
                ),
                useCases = listOf(adlId),
                details = EvalOutput(
                    verdict = "pass",
                    score = 88,
                    reasons = listOf("Matched expected conversation."),
                    missingRequirements = emptyList(),
                    violations = emptyList(),
                    evidence = emptyList(),
                ),
            )
        ),
    )
}

