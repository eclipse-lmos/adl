// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import io.ktor.http.headersOf
import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationCommand
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryOrganizationRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class OwnerAccessResolverTest {

    private fun resolver(repository: InMemoryOrganizationRepository): OwnerAccessResolver = OwnerAccessResolver(
        organizationRepository = repository,
        organizationSessionCookieManager = OrganizationSessionCookieManager(secret = "test-secret"),
    )

    @Test
    fun `resolver falls back to public without organization headers`() = runBlocking {
        val resolver = resolver(InMemoryOrganizationRepository())

        val access = resolver.resolve(headersOf())

        assertEquals(DEFAULT_OWNER, access.owner)
        assertNull(access.failure)
    }

    @Test
    fun `resolver returns unauthorized when protected organization has no api key`() = runBlocking {
        val repository = InMemoryOrganizationRepository()
        val resolver = resolver(repository)

        val access = resolver.resolve(headersOf(ORGANIZATION_ID_HEADER, "telekom-demo"))

        assertEquals(DEFAULT_OWNER, access.owner)
        assertNotNull(access.failure)
        val failure = access.failure!!
        assertEquals(401, failure.statusCode)
        assertEquals("Missing organization API key.", failure.message)
    }

    @Test
    fun `resolver returns forbidden for invalid api key`() = runBlocking {
        val repository = InMemoryOrganizationRepository()
        val resolver = resolver(repository)

        val access = resolver.resolve(
            headersOf(
                ORGANIZATION_ID_HEADER to listOf("telekom-demo"),
                ORGANIZATION_API_KEY_HEADER to listOf("invalid-key"),
            ),
        )

        assertEquals(DEFAULT_OWNER, access.owner)
        assertNotNull(access.failure)
        val failure = access.failure!!
        assertEquals(403, failure.statusCode)
        assertEquals("Invalid or revoked organization API key.", failure.message)
    }

    @Test
    fun `resolver maps valid api key to organization owner`() = runBlocking {
        val repository = InMemoryOrganizationRepository()
        val created = repository.create(
            CreateOrganizationCommand(
                id = "telekom-demo",
                name = "Telekom Demo",
                descriptions = "Demo org",
                initialApiKeyLabel = "studio",
            ),
        )
        val resolver = resolver(repository)

        val access = resolver.resolve(
            headersOf(
                ORGANIZATION_ID_HEADER to listOf("telekom-demo"),
                ORGANIZATION_API_KEY_HEADER to listOf(created.createdApiKey),
            ),
        )

        assertEquals("telekom-demo", access.owner)
        assertNull(access.failure)
    }

    @Test
    fun `resolver rejects mismatched organization id and valid api key`() = runBlocking {
        val repository = InMemoryOrganizationRepository()
        val created = repository.create(
            CreateOrganizationCommand(
                id = "telekom-demo",
                name = "Telekom Demo",
                descriptions = "Demo org",
                initialApiKeyLabel = "studio",
            ),
        )
        val resolver = resolver(repository)

        val access = resolver.resolve(
            headersOf(
                ORGANIZATION_ID_HEADER to listOf("another-org"),
                ORGANIZATION_API_KEY_HEADER to listOf(created.createdApiKey),
            ),
        )

        assertEquals(DEFAULT_OWNER, access.owner)
        assertNotNull(access.failure)
        val failure = access.failure!!
        assertEquals(403, failure.statusCode)
        assertEquals("Organization API key does not match the requested organization.", failure.message)
    }
}

