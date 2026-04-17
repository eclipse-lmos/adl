// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class OrganizationSessionCookieManagerTest {

    @Test
    fun `cookie manager returns stored api key before expiry`() {
        val clock = Clock.fixed(Instant.parse("2026-03-16T10:15:30Z"), ZoneOffset.UTC)
        val cookieManager = OrganizationSessionCookieManager(
            secret = "test-secret",
            clock = clock,
            maxAgeSeconds = 120,
        )

        val cookieValue = cookieManager.createCookieValue("org-secret-api-key")

        assertEquals("org-secret-api-key", cookieManager.resolveApiKey(cookieValue))
    }

    @Test
    fun `cookie manager rejects expired cookies`() {
        val issuedAt = Instant.parse("2026-03-16T10:15:30Z")
        val createClock = Clock.fixed(issuedAt, ZoneOffset.UTC)
        val expiredClock = Clock.fixed(issuedAt.plusSeconds(121), ZoneOffset.UTC)
        val issuingCookieManager = OrganizationSessionCookieManager(
            secret = "test-secret",
            clock = createClock,
            maxAgeSeconds = 120,
        )
        val validatingCookieManager = OrganizationSessionCookieManager(
            secret = "test-secret",
            clock = expiredClock,
            maxAgeSeconds = 120,
        )

        val cookieValue = issuingCookieManager.createCookieValue("org-secret-api-key")

        assertNull(validatingCookieManager.resolveApiKey(cookieValue))
    }

    @Test
    fun `cookie manager rejects tampered cookies`() {
        val cookieManager = OrganizationSessionCookieManager(
            secret = "test-secret",
            clock = Clock.fixed(Instant.parse("2026-03-16T10:15:30Z"), ZoneOffset.UTC),
            maxAgeSeconds = 120,
        )

        val cookieValue = cookieManager.createCookieValue("org-secret-api-key") + "tampered"

        assertNull(cookieManager.resolveApiKey(cookieValue))
    }
}

