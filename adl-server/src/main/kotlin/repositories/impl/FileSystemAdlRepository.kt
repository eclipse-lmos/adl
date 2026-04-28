// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.repositories.AdlRepository
import org.slf4j.LoggerFactory
import java.io.File
import java.time.Instant
import java.util.Base64

class FileSystemAdlRepository(private val folder: File) : AdlRepository {
    private val log = LoggerFactory.getLogger(FileSystemAdlRepository::class.java)
    private val processor = YamlFrontMatterProcessor()

    init {
        if (!folder.exists()) {
            folder.mkdirs()
        }
    }

    override suspend fun store(adl: Adl): Adl {
        val scopedAdl = adl.copy(owner = currentOwner())
        val id = if (scopedAdl.id.isBlank()) "new-adl" else scopedAdl.id
        val file = fileForId(id, scopedAdl.owner)
        file.parentFile?.mkdirs()

        val metadata = mutableMapOf<String, Any>()
        metadata["id"] = id
        metadata["owner"] = scopedAdl.owner
        if (scopedAdl.tags.isNotEmpty()) metadata["tags"] = scopedAdl.tags
        if (!scopedAdl.output.isNullOrBlank()) metadata["output"] = scopedAdl.output
        if (scopedAdl.examples.isNotEmpty()) metadata["examples"] = scopedAdl.examples
        if (scopedAdl.version != "1.0.0") metadata["version"] = scopedAdl.version

        val frontMatter = YamlFrontMatter(metadata, scopedAdl.content)
        val text = processor.write(frontMatter)

        file.writeText(text)
        return scopedAdl
    }

    override suspend fun get(id: String): Adl? {
        val file = fileForId(id, currentOwner())
        if (file.name.endsWith(AGENT_FILE_EXTENSION)) return null
        if (!file.exists()) return null

        return try {
            val text = file.readText()
            val frontMatter = processor.parse(text)
            val metadata = frontMatter.metadata

            val adlId = metadata["id"]?.toString() ?: id
            val tags = (metadata["tags"] as? List<*>)?.map { it.toString() } ?: emptyList()
            val output = metadata["output"]?.toString()
            val examples = (metadata["examples"] as? List<*>)?.map { it.toString() } ?: emptyList()
            val version = metadata["version"]?.toString() ?: "1.0.0"
            val owner = metadata["owner"]?.toString() ?: DEFAULT_OWNER

            Adl(
                id = adlId,
                content = frontMatter.content,
                tags = tags,
                createdAt = Instant.ofEpochMilli(file.lastModified()).toString(),
                examples = examples,
                output = output,
                relevance = null,
                version = version,
                owner = owner,
            )
        } catch (e: Exception) {
            log.error("Error reading ADL file $id", e)
            null
        }
    }

    override suspend fun list(): List<Adl> {
        val ownerFolder = folderForOwner(currentOwner())
        return ownerFolder.listFiles { _, name -> name.endsWith(".md") && !name.endsWith(AGENT_FILE_EXTENSION) }
            ?.mapNotNull { file ->
                val id = fileIdFrom(file, currentOwner())
                get(id)
            }
            ?: emptyList()
    }

    override suspend fun deleteById(id: String) {
        val file = fileForId(id, currentOwner())
        if (file.exists()) {
            file.delete()
        }
    }

    private fun fileForId(id: String, owner: String): File {
        return if (owner == DEFAULT_OWNER) {
            File(folderForOwner(owner), "$id.md")
        } else {
            File(folderForOwner(owner), "${encode(id)}.md")
        }
    }

    private fun folderForOwner(owner: String): File {
        return if (owner == DEFAULT_OWNER) folder else File(folder, encode(owner)).apply { mkdirs() }
    }

    private fun encode(value: String): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(value.toByteArray(Charsets.UTF_8))

    private fun decodeId(value: String): String =
        String(Base64.getUrlDecoder().decode(value), Charsets.UTF_8)

    private fun fileIdFrom(file: File, owner: String): String {
        return if (owner == DEFAULT_OWNER) file.nameWithoutExtension else decodeId(file.nameWithoutExtension)
    }

    private companion object {
        const val AGENT_FILE_EXTENSION = ".agent.md"
    }
}
