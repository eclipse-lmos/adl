// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.repositories.impl

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.fasterxml.jackson.module.kotlin.readValue

data class YamlFrontMatter(
    val metadata: Map<String, Any>,
    val content: String
)

class YamlFrontMatterProcessor {
    private val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())
    private val delimiter = "---"

    fun parse(text: String): YamlFrontMatter {
        val lines = text.lines()
        if (lines.isEmpty() || lines.first().trim() != delimiter) {
            return YamlFrontMatter(emptyMap(), text)
        }

        val metadataLines = mutableListOf<String>()
        var contentStartIndex = -1

        for (i in 1 until lines.size) {
            if (lines[i].trim() == delimiter) {
                contentStartIndex = i + 1
                break
            }
            metadataLines.add(lines[i])
        }

        if (contentStartIndex == -1) {
            // separator not closed, treat everything as content or handle as error?
            // Jekyll treats it as content if not closed
            return YamlFrontMatter(emptyMap(), text)
        }

        val metadataText = metadataLines.joinToString("\n")
        val metadata: Map<String, Any> = try {
            if (metadataText.isBlank()) emptyMap() else mapper.readValue(metadataText)
        } catch (e: Exception) {
            emptyMap() // Or throw?
        }

        // Rejoin content, preserving original newlines if possible, but lines() eats them.
        // Better to use substring.

        // Let's re-implement using indexes for better content preservation
        return parseWithIndexes(text)
    }

    private fun parseWithIndexes(text: String): YamlFrontMatter {
        val trimmed = text.trimStart() // only trim start to check for ---
        if (!trimmed.startsWith(delimiter)) {
            return YamlFrontMatter(emptyMap(), text)
        }

        // Find the end delimiter
        // We look for "\n---" or "\r\n---"
        // But the first line is the start delimiter.

        // indexOf after the first delimiter
        val firstDelimiterEnd = text.indexOf(delimiter) + delimiter.length
        val endDelimiterIndex = text.indexOf("\n$delimiter", firstDelimiterEnd)

        if (endDelimiterIndex == -1) {
             // Try strict matching for single line file?
             // If file is just "---\nfoo: bar\n---", then endDelimiter is at end.
             // If we can't find the second delimiter, return full text as content.
             return YamlFrontMatter(emptyMap(), text)
        }

        val metadataParams = text.substring(firstDelimiterEnd, endDelimiterIndex)
        val content = text.substring(endDelimiterIndex + delimiter.length + 1).trimStart() // +1 for the newline before --- ?
        // actually text.indexOf("\n---") points to the newline.
        // So endDelimiterIndex is the index of \n.
        // We want to substring from firstDelimiterEnd to endDelimiterIndex.

        // Wait, text.indexOf("\n---")
        // index is of \n.
        // substring(firstDelimiterEnd, endDelimiterIndex) gets everything between.

        // content starts after "\n---" + maybe "\n" or space?
        // Let's look at the example:
        // ---
        // meta
        // ---
        // <newline>
        // content

        val contentStartIndex = endDelimiterIndex + delimiter.length + 1 // +1 for \n matched
        // But wait, the matched string is "\n---". exact length is 1 + 3 = 4.

        val contentRaw = if (contentStartIndex < text.length) text.substring(contentStartIndex) else ""
        // Usually there is a newline after the second ---. If so, we might want to trim that ONE newline.
        val finalContent = if (contentRaw.startsWith("\n")) contentRaw.substring(1)
                          else if (contentRaw.startsWith("\r\n")) contentRaw.substring(2)
                          else contentRaw

        val metadata: Map<String, Any> = try {
            if (metadataParams.isBlank()) emptyMap() else mapper.readValue(metadataParams)
        } catch (e: Exception) {
            emptyMap()
        }

        return YamlFrontMatter(metadata, finalContent)
    }

    fun write(frontMatter: YamlFrontMatter): String {
        if (frontMatter.metadata.isEmpty()) {
            return frontMatter.content
        }
        val metadataText = mapper.writeValueAsString(frontMatter.metadata).trim()
        // Jackson adds --- at start of document usually?
        // Default YAML factory does.
        // If it sends "---" itself, we should handle it.
        // But mapper.writeValueAsString for a Map usually formats content.
        // Let's check output.
        // If we want exact structure:
        // ---
        // key: value
        // ---
        // content

        var cleanMetadata = metadataText
        if (cleanMetadata.startsWith("---")) {
             cleanMetadata = cleanMetadata.substring(3).trim()
        }

        return buildString {
            appendLine(delimiter)
            appendLine(cleanMetadata)
            appendLine(delimiter)
            appendLine() // Empty line after front matter
            append(frontMatter.content)
        }
    }
}

