// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemAdlRepository
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class FileSystemAdlRepositoryTest {

    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `list does not load ADL agent markdown files`() = runBlocking {
        val repository = FileSystemAdlRepository(tempDir.toFile())
        repository.store(Adl(id = "code_reviews", content = "### UseCase: code_reviews", tags = emptyList(), createdAt = ""))
        tempDir.resolve("code-review.agent.md").toFile().writeText(
            """
            ---
            id: "code-review-agent"
            ---

            ## Agent: Code Review Agent

            ### Prompt
            Review code carefully.
            """.trimIndent()
        )

        assertThat(repository.list().map { it.id }).containsExactly("code_reviews")
    }

    @Test
    fun `get does not load files with ADL agent extension`() = runBlocking {
        val repository = FileSystemAdlRepository(tempDir.toFile())
        tempDir.resolve("code-review.agent.md").toFile().writeText(
            """
            ---
            id: "code-review-agent"
            ---

            ## Agent: Code Review Agent
            """.trimIndent()
        )

        assertThat(repository.get("code-review.agent")).isNull()
    }
}
