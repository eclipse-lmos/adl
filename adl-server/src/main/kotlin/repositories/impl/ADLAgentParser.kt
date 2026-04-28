// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.DEFAULT_OWNER
import org.eclipse.lmos.adl.server.models.Agent

/**
 * Parses ADL agent Markdown documents into agent models.
 */
class ADLAgentParser(
    private val processor: YamlFrontMatterProcessor = YamlFrontMatterProcessor(),
) {

    /**
     * Parses a Markdown string into an [Agent].
     */
    fun parse(markdown: String): Agent = parse(markdown, fallbackId = null, fallbackOwner = DEFAULT_OWNER)

    /**
     * Parses a Markdown string into an [Agent] using repository-provided fallbacks when metadata is absent.
     */
    fun parse(markdown: String, fallbackId: String?, fallbackOwner: String): Agent {
        val frontMatter = processor.parse(markdown)
        val metadata = frontMatter.metadata
        val name = agentNameFrom(frontMatter.content)
        val id = metadata["id"]?.toString() ?: fallbackId ?: name

        require(!id.isNullOrBlank()) { "ADL agent markdown must define an id or an Agent heading." }

        return Agent(
            id = id,
            name = name ?: id,
            active = activeFrom(metadata),
            description = sectionFrom(frontMatter.content, "Description"),
            models = stringListFrom(metadata["models"]),
            tags = stringListFrom(metadata["tags"]),
            mcpServers = stringListFrom(metadata["mcpServers"]),
            role = metadata["role"]?.toString(),
            corePrompt = sectionFrom(frontMatter.content, "Prompt"),
            owner = metadata["owner"]?.toString() ?: fallbackOwner,
        )
    }

    private fun agentNameFrom(content: String): String? {
        return content.lineSequence()
            .mapNotNull { line -> AGENT_HEADING.matchEntire(line.trim())?.groupValues?.get(1)?.trim() }
            .firstOrNull { it.isNotBlank() }
    }

    private fun sectionFrom(content: String, title: String): String? {
        val lines = content.lines()
        val start = lines.indexOfFirst { line -> headingTitle(line)?.equals(title, ignoreCase = true) == true }
        if (start == -1) return null

        val startLevel = headingLevel(lines[start]) ?: return null
        val end = lines.drop(start + 1).indexOfFirst { line ->
            val level = headingLevel(line)
            level != null && level <= startLevel
        }.let { relativeEnd -> if (relativeEnd == -1) lines.size else start + 1 + relativeEnd }

        return lines.subList(start + 1, end)
            .joinToString("\n")
            .trim()
            .takeIf { it.isNotBlank() }
    }

    private fun headingTitle(line: String): String? = HEADING.matchEntire(line.trim())?.groupValues?.get(2)?.trim()

    private fun headingLevel(line: String): Int? = HEADING.matchEntire(line.trim())?.groupValues?.get(1)?.length

    private fun activeFrom(metadata: Map<String, Any>): Boolean {
        val active = metadata["active"] ?: return true
        return active as? Boolean ?: active.toString().toBooleanStrictOrNull() ?: true
    }

    private fun stringListFrom(value: Any?): List<String>? {
        return (value as? List<*>)
            ?.map { it.toString() }
            ?.takeIf { it.isNotEmpty() }
    }

    private companion object {
        val AGENT_HEADING = Regex("^#{1,6}\\s+Agent:\\s*(.+?)\\s*$")
        val HEADING = Regex("^(#{1,6})\\s+(.+?)\\s*$")
    }
}
