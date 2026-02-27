// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.agents.extensions

/**
 * Utility class for handling widget references in markdown content.
 * Widget references are formatted as: ```widget:widgetname```
 */
private val REGEX = Regex("```widget:([\\s\\S]*?)```")

fun String.removeWidgetRef(): String {
    return replace(REGEX, "").trim()
}

fun String.addWidgetRef(widgetName: String): String {
    return "$this\n```widget:$widgetName```"
}

fun String.extractWidgetRef(): String? {
    return REGEX.find(this)?.groupValues?.get(1)?.trim()
}

