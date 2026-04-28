// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.repositories.AgentRepository
import org.slf4j.LoggerFactory
import java.io.File
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.util.Base64

/**
 * Stores and loads ADL agent definitions from Markdown files with YAML front matter.
 */
class FileSystemAgentRepository(private val folder: File) : AgentRepository {
    private val log = LoggerFactory.getLogger(FileSystemAgentRepository::class.java)
    private val processor = YamlFrontMatterProcessor()
    private val parser = ADLAgentParser(processor)

    init {
        if (!folder.exists()) {
            folder.mkdirs()
        }
    }

    override fun save(agent: Agent): Agent {
        val scopedAgent = agent.copy(owner = currentOwner())
        val targetFile = fileForId(scopedAgent.id, scopedAgent.owner)
        targetFile.parentFile?.mkdirs()

        val metadata = mutableMapOf<String, Any>("id" to scopedAgent.id)
        metadata["owner"] = scopedAgent.owner
        if (!scopedAgent.active) metadata["active"] = scopedAgent.active
        if (!scopedAgent.tags.isNullOrEmpty()) metadata["tags"] = scopedAgent.tags
        if (!scopedAgent.mcpServers.isNullOrEmpty()) metadata["mcpServers"] = scopedAgent.mcpServers
        if (!scopedAgent.models.isNullOrEmpty()) metadata["models"] = scopedAgent.models
        if (!scopedAgent.role.isNullOrBlank()) metadata["role"] = scopedAgent.role

        val tempFile = File.createTempFile(targetFile.nameWithoutExtension, ".tmp", targetFile.parentFile)
        return try {
            tempFile.writeText(processor.write(YamlFrontMatter(metadata, renderContent(scopedAgent))))
            try {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING, ATOMIC_MOVE)
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(tempFile.toPath(), targetFile.toPath(), REPLACE_EXISTING)
            }
            scopedAgent
        } catch (exception: Exception) {
            tempFile.delete()
            throw exception
        }
    }

    override fun findById(id: String): Agent? {
        val file = fileForId(id, currentOwner())
        if (file.exists()) {
            return readAgent(file)
        }

        return findAll().firstOrNull { it.id == id }
    }

    override fun findAll(): List<Agent> {
        val ownerFolder = folderForOwner(currentOwner())
        return ownerFolder.listFiles { _, fileName -> fileName.endsWith(FILE_EXTENSION) }
            ?.sortedBy { it.name }
            ?.mapNotNull(::readAgent)
            ?: emptyList()
    }

    override fun delete(id: String): Boolean {
        val file = fileForId(id, currentOwner())
        if (file.exists()) {
            return file.delete()
        }

        val matchingFile = folderForOwner(currentOwner())
            .listFiles { _, fileName -> fileName.endsWith(FILE_EXTENSION) }
            ?.firstOrNull { readAgent(it)?.id == id }

        return matchingFile?.delete() ?: false
    }

    private fun readAgent(file: File): Agent? {
        return try {
            parser.parse(file.readText(), fallbackId = file.name.removeSuffix(FILE_EXTENSION), fallbackOwner = currentOwner())
        } catch (exception: Exception) {
            log.error("Error reading ADL agent file {}", file.name, exception)
            null
        }
    }

    private fun renderContent(agent: Agent): String = buildString {
        appendLine("## Agent: ${agent.name}")
        appendLine()
        agent.description?.let { description ->
            appendLine("### Description")
            appendLine(description.trimEnd())
            appendLine()
        }
        agent.corePrompt?.let { prompt ->
            appendLine("### Prompt")
            append(prompt.trimEnd())
        }
    }

    private fun fileForId(id: String, owner: String): File {
        return File(folderForOwner(owner), "${encode(id)}$FILE_EXTENSION")
    }

    private fun folderForOwner(owner: String): File {
        return if (owner == DEFAULT_OWNER) folder else File(folder, encode(owner)).apply { mkdirs() }
    }

    private fun encode(value: String): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(value.toByteArray(Charsets.UTF_8))

    private companion object {
        const val FILE_EXTENSION = ".agent.md"
    }
}

