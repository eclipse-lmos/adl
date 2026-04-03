// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path

class AdlServerFileRepositoryFoldersTest {

    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `local adls folder becomes shared root for all filesystem repositories`() {
        val localAdlFolder = tempDir.resolve("adls").toFile().apply { mkdirs() }

        val folders = resolveFileRepositoryFolders(
            adlFolderOverride = null,
            widgetFolderOverride = null,
            testCaseFolderOverride = null,
            testRunFolderOverride = null,
            localAdlFolder = localAdlFolder,
        )

        assertEquals(localAdlFolder, folders.adlFolder)
        assertEquals(localAdlFolder.resolve("widgets"), folders.widgetFolder)
        assertEquals(localAdlFolder.resolve("test-cases"), folders.testCaseFolder)
        assertEquals(localAdlFolder.resolve("test-runs"), folders.testRunFolder)
    }

    @Test
    fun `adl folder override becomes shared root for widget and test case subfolders`() {
        val configuredRoot = tempDir.resolve("custom-adls").toFile()

        val folders = resolveFileRepositoryFolders(
            adlFolderOverride = configuredRoot.absolutePath,
            widgetFolderOverride = null,
            testCaseFolderOverride = null,
            testRunFolderOverride = null,
            localAdlFolder = File(tempDir.toFile(), "unused"),
        )

        assertEquals(configuredRoot, folders.adlFolder)
        assertEquals(configuredRoot.resolve("widgets"), folders.widgetFolder)
        assertEquals(configuredRoot.resolve("test-cases"), folders.testCaseFolder)
        assertEquals(configuredRoot.resolve("test-runs"), folders.testRunFolder)
    }

    @Test
    fun `explicit widget and test case overrides win over shared adl root`() {
        val configuredRoot = tempDir.resolve("custom-adls").toFile()
        val widgetOverride = tempDir.resolve("custom-widgets").toFile()
        val testCaseOverride = tempDir.resolve("custom-tests").toFile()
        val testRunOverride = tempDir.resolve("custom-test-runs").toFile()

        val folders = resolveFileRepositoryFolders(
            adlFolderOverride = configuredRoot.absolutePath,
            widgetFolderOverride = widgetOverride.absolutePath,
            testCaseFolderOverride = testCaseOverride.absolutePath,
            testRunFolderOverride = testRunOverride.absolutePath,
            localAdlFolder = File(tempDir.toFile(), "unused"),
        )

        assertEquals(configuredRoot, folders.adlFolder)
        assertEquals(widgetOverride, folders.widgetFolder)
        assertEquals(testCaseOverride, folders.testCaseFolder)
        assertEquals(testRunOverride, folders.testRunFolder)
    }

    @Test
    fun `without shared root or overrides widget and test case repositories stay in memory`() {
        val folders = resolveFileRepositoryFolders(
            adlFolderOverride = null,
            widgetFolderOverride = null,
            testCaseFolderOverride = null,
            testRunFolderOverride = null,
            localAdlFolder = File(tempDir.toFile(), "missing-adls"),
        )

        assertNull(folders.adlFolder)
        assertNull(folders.widgetFolder)
        assertNull(folders.testCaseFolder)
        assertNull(folders.testRunFolder)
    }
}
