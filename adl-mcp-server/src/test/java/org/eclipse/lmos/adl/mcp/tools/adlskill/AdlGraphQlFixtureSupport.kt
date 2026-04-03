// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.mcp.tools.adlskill

object AdlGraphQlFixtureSupport {
    fun readFixture(name: String): String {
        val resourcePath = "get_adl_skill/$name"
        return checkNotNull(AdlGraphQlFixtureSupport::class.java.classLoader.getResourceAsStream(resourcePath)) {
            "Fixture not found: $resourcePath"
        }.bufferedReader().use { it.readText() }
    }
}