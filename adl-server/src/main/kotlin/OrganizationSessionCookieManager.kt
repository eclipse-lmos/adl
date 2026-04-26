// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

const val ORGANIZATION_SESSION_COOKIE_NAME = "adl_organization_session"

/**
 * Encrypts and decrypts organization API keys for secure HTTP-only session cookies.
 */
class OrganizationSessionCookieManager(
    secret: String,
    private val clock: Clock = Clock.systemUTC(),
    private val maxAgeSeconds: Long = EnvConfig.organizationSessionMaxAgeSeconds,
) {
    private val json = Json {
        ignoreUnknownKeys = true
    }
    private val secureRandom = SecureRandom()
    private val encryptionKey = SecretKeySpec(
        MessageDigest.getInstance("SHA-256").digest(secret.toByteArray(StandardCharsets.UTF_8)),
        "AES",
    )

    fun maxAgeSeconds(): Long = maxAgeSeconds

    @OptIn(ExperimentalEncodingApi::class)
    fun createCookieValue(rawApiKey: String): String {
        val now = clock.instant().epochSecond
        val payload = OrganizationSessionPayload(
            apiKey = rawApiKey,
            issuedAtEpochSeconds = now,
            expiresAtEpochSeconds = now + maxAgeSeconds,
        )
        val initializationVector = ByteArray(GCM_INITIALIZATION_VECTOR_SIZE).also(secureRandom::nextBytes)
        val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, GCMParameterSpec(GCM_TAG_LENGTH_BITS, initializationVector))
        val encryptedPayload = cipher.doFinal(json.encodeToString(payload).toByteArray(StandardCharsets.UTF_8))
        val combinedPayload = initializationVector + encryptedPayload
        return "$COOKIE_VERSION_PREFIX.${Base64.UrlSafe.encode(combinedPayload)}"
    }

    @OptIn(ExperimentalEncodingApi::class)
    fun resolveApiKey(cookieValue: String?): String? {
        if (cookieValue.isNullOrBlank() || !cookieValue.startsWith("$COOKIE_VERSION_PREFIX.")) {
            return null
        }

        return try {
            val encodedPayload = cookieValue.substringAfter("$COOKIE_VERSION_PREFIX.")
            val combinedPayload = Base64.UrlSafe.decode(encodedPayload)
            if (combinedPayload.size <= GCM_INITIALIZATION_VECTOR_SIZE) {
                return null
            }

            val initializationVector = combinedPayload.copyOfRange(0, GCM_INITIALIZATION_VECTOR_SIZE)
            val encryptedPayload = combinedPayload.copyOfRange(GCM_INITIALIZATION_VECTOR_SIZE, combinedPayload.size)
            val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, GCMParameterSpec(GCM_TAG_LENGTH_BITS, initializationVector))
            val decryptedPayload = cipher.doFinal(encryptedPayload)
            val payload = json.decodeFromString<OrganizationSessionPayload>(decryptedPayload.decodeToString())
            if (payload.expiresAtEpochSeconds <= clock.instant().epochSecond) {
                null
            } else {
                payload.apiKey.trim().takeIf { it.isNotBlank() }
            }
        } catch (_: Exception) {
            null
        }
    }

    @Serializable
    private data class OrganizationSessionPayload(
        val apiKey: String,
        val issuedAtEpochSeconds: Long,
        val expiresAtEpochSeconds: Long,
    )

    private companion object {
        private const val COOKIE_VERSION_PREFIX = "v1"
        private const val CIPHER_TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_INITIALIZATION_VECTOR_SIZE = 12
        private const val GCM_TAG_LENGTH_BITS = 128
    }
}

