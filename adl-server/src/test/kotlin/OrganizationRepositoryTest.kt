// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationApiKeyCommand
import org.eclipse.lmos.adl.server.repositories.CreateOrganizationCommand
import org.eclipse.lmos.adl.server.repositories.RotateOrganizationApiKeyCommand
import org.eclipse.lmos.adl.server.repositories.UpdateOrganizationCommand
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryOrganizationRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class OrganizationRepositoryTest {

    @Test
    fun `organization api keys are hashed masked and verifiable`() {
        val rawKey = generateOrganizationApiKey()
        val hashedKey = hashOrganizationApiKey(rawKey)
        val maskedKey = maskOrganizationApiKey(rawKey)

        assertTrue(rawKey.startsWith("adl_org_live_"))
        assertNotEquals(rawKey, hashedKey)
        assertTrue(maskedKey.contains("..."))
        assertTrue(matchesOrganizationApiKey(rawKey, hashedKey))
        assertFalse(matchesOrganizationApiKey("invalid-key", hashedKey))
    }

    @Test
    fun `repository enforces at least one active api key and supports rotation`() = runBlocking {
        val repository = InMemoryOrganizationRepository()

        val created = repository.create(
            CreateOrganizationCommand(
                id = "telekom-demo",
                name = "Telekom Demo",
                descriptions = "Demo organization",
                initialApiKeyLabel = "studio",
            ),
        )

        assertEquals("telekom-demo", created.organization.id)
        assertEquals(1, created.organization.apiKeys.size)
        assertNotNull(repository.resolveByApiKey(created.createdApiKey))
        assertTrue(created.organization.apiKeys.first().maskedKey.contains("..."))
        assertFalse(created.organization.apiKeys.first().hashedKey.contains(created.createdApiKey))

        val lastKeyRevocation = assertThrows(IllegalArgumentException::class.java) {
            runBlocking {
                repository.revokeApiKey("telekom-demo", created.organization.apiKeys.first().id)
            }
        }
        assertEquals(
            "Organizations must retain at least one active API key. Rotate the last key instead of revoking it.",
            lastKeyRevocation.message,
        )

        val updated = repository.update(
            UpdateOrganizationCommand(
                id = "telekom-demo",
                name = "Telekom Demo Updated",
                descriptions = "Updated description",
            ),
        )
        assertEquals("Telekom Demo Updated", updated.name)

        val rotated = repository.createApiKey(
            CreateOrganizationApiKeyCommand(
                organizationId = "telekom-demo",
                label = "ci",
            ),
        )
        assertEquals(2, rotated.organization.apiKeys.size)
        assertNotNull(repository.resolveByApiKey(rotated.createdApiKey))

        val revoked = repository.revokeApiKey("telekom-demo", created.organization.apiKeys.first().id)
        val revokedKey = revoked.apiKeys.first { it.label == "studio" }
        assertTrue(revokedKey.revoked)
        assertNull(repository.resolveByApiKey(created.createdApiKey))
        assertNotNull(repository.resolveByApiKey(rotated.createdApiKey))

        val rotatedReplacement = repository.rotateApiKey(
            RotateOrganizationApiKeyCommand(
                organizationId = "telekom-demo",
                apiKeyId = rotated.apiKey.id,
            ),
        )
        assertEquals(3, rotatedReplacement.organization.apiKeys.size)
        assertNull(repository.resolveByApiKey(rotated.createdApiKey))
        assertNotNull(repository.resolveByApiKey(rotatedReplacement.createdApiKey))
    }

    @Test
    fun `repository deletes organizations and invalidates their api keys`() = runBlocking {
        val repository = InMemoryOrganizationRepository()
        val created = repository.create(
            CreateOrganizationCommand(
                id = "delete-me",
                name = "Delete Me",
                descriptions = "Ephemeral organization",
                initialApiKeyLabel = "studio",
            ),
        )

        assertTrue(repository.delete("delete-me"))
        assertFalse(repository.delete("delete-me"))
        assertNull(repository.findById("delete-me"))
        assertNull(repository.resolveByApiKey(created.createdApiKey))
    }

    @Test
    fun `public organization remains available without api keys`() = runBlocking {
        val repository = InMemoryOrganizationRepository()

        val organizations = repository.findAll()
        val publicOrganization = repository.findById(DEFAULT_OWNER)

        assertTrue(organizations.any { it.id == DEFAULT_OWNER })
        assertNotNull(publicOrganization)
        assertEquals(0, publicOrganization!!.apiKeys.size)
    }
}

