// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.repositories.AdlRepository
import org.slf4j.LoggerFactory
import java.io.File
import java.time.Instant

class FileSystemAdlRepository(private val folder: File) : AdlRepository {
    private val log = LoggerFactory.getLogger(FileSystemAdlRepository::class.java)
    private val processor = YamlFrontMatterProcessor()

    init {
        if (!folder.exists()) {
            folder.mkdirs()
        }
    }

    override suspend fun store(adl: Adl): Adl {
        val id = if (adl.id.isBlank()) "new-adl" else adl.id
        val file = File(folder, "$id.md")

        val metadata = mutableMapOf<String, Any>()
        metadata["id"] = id
        if (adl.tags.isNotEmpty()) metadata["tags"] = adl.tags
        if (!adl.output.isNullOrBlank()) metadata["output"] = adl.output
        if (adl.examples.isNotEmpty()) metadata["examples"] = adl.examples
        if (adl.version != "1.0.0") metadata["version"] = adl.version

        val frontMatter = YamlFrontMatter(metadata, adl.content)
        val text = processor.write(frontMatter)

        file.writeText(text)
        return adl
    }

    override suspend fun get(id: String): Adl? {
        val file = File(folder, "$id.md")
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

            Adl(
                id = adlId,
                content = frontMatter.content,
                tags = tags,
                createdAt = Instant.ofEpochMilli(file.lastModified()).toString(),
                examples = examples,
                output = output,
                relevance = null,
                version = version
            )
        } catch (e: Exception) {
            log.error("Error reading ADL file $id", e)
            null
        }
    }

    override suspend fun list(): List<Adl> {
        return folder.listFiles { _, name -> name.endsWith(".md") }
            ?.mapNotNull { file ->
                val id = file.nameWithoutExtension
                get(id)
            }
            ?: emptyList()
    }

    override suspend fun deleteById(id: String) {
        val file = File(folder, "$id.md")
        if (file.exists()) {
            file.delete()
        }
    }
}
