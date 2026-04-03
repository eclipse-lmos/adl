// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

private const val ORGANIZATION_API_KEY_PREFIX = "adl_org_live_"
private val secureRandom = SecureRandom()

/**
 * Generates a new organization API key.
 */
fun generateOrganizationApiKey(): String {
    val entropy = ByteArray(24)
    secureRandom.nextBytes(entropy)
    val suffix = Base64.getUrlEncoder().withoutPadding().encodeToString(entropy)
    return "$ORGANIZATION_API_KEY_PREFIX$suffix"
}

/**
 * Hashes a raw organization API key for persistent storage.
 */
fun hashOrganizationApiKey(rawApiKey: String): String {
    val digest = MessageDigest.getInstance("SHA-256")
    return digest.digest(rawApiKey.toByteArray(Charsets.UTF_8)).toHexString()
}

/**
 * Compares a raw organization API key against a stored hash in constant time.
 */
fun matchesOrganizationApiKey(rawApiKey: String, hashedApiKey: String): Boolean {
    val expected = hashOrganizationApiKey(rawApiKey).toByteArray(Charsets.UTF_8)
    val actual = hashedApiKey.toByteArray(Charsets.UTF_8)
    return MessageDigest.isEqual(expected, actual)
}

/**
 * Masks a raw organization API key for display purposes.
 */
fun maskOrganizationApiKey(rawApiKey: String): String {
    if (rawApiKey.length <= 10) {
        return rawApiKey
    }
    return "${rawApiKey.take(12)}...${rawApiKey.takeLast(3)}"
}

private fun ByteArray.toHexString(): String = joinToString(separator = "") { byte ->
    "%02x".format(byte)
}

