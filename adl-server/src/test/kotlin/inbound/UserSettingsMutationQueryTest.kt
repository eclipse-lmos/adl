// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound

import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.eclipse.lmos.adl.server.inbound.mutation.UserSettingsMutation
import org.eclipse.lmos.adl.server.inbound.query.UserSettingsQuery
import org.eclipse.lmos.adl.server.repositories.UserSettingsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryUserSettingsRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class UserSettingsMutationQueryTest {

    private lateinit var repository: UserSettingsRepository
    private lateinit var mutation: UserSettingsMutation
    private lateinit var query: UserSettingsQuery

    @BeforeEach
    fun setUp() {
        repository = InMemoryUserSettingsRepository()
        mutation = UserSettingsMutation(repository)
        query = UserSettingsQuery(repository)
    }

    @Test
    fun `setUserSettings stores embedding fields and masks secrets in responses`() = runBlocking {
        val result = mutation.setUserSettings(
            apiKey = "primary-secret-123",
            modelName = "gpt-4.1",
            modelUrl = "https://chat.example/v1",
            embeddingModel = "text-embedding-3-small",
            embeddingUrl = "https://embed.example/v1",
            embeddingKey = "embedding-secret-456"
        )

        assertThat(result.apiKey).isEqualTo("...123")
        assertThat(result.modelName).isEqualTo("gpt-4.1")
        assertThat(result.modelUrl).isEqualTo("https://chat.example/v1")
        assertThat(result.embeddingModel).isEqualTo("text-embedding-3-small")
        assertThat(result.embeddingUrl).isEqualTo("https://embed.example/v1")
        assertThat(result.embeddingKey).isEqualTo("...456")

        val stored = repository.get()
        assertThat(stored?.apiKey).isEqualTo("primary-secret-123")
        assertThat(stored?.embeddingKey).isEqualTo("embedding-secret-456")

        val queried = query.userSettings()
        assertThat(queried?.apiKey).isEqualTo("...123")
        assertThat(queried?.embeddingKey).isEqualTo("...456")
    }

    @Test
    fun `setUserSettings preserves stored secrets when masked values are resubmitted`() = runBlocking {
        mutation.setUserSettings(
            apiKey = "primary-secret-123",
            modelName = "gpt-4.1",
            modelUrl = "https://chat.example/v1",
            embeddingModel = "text-embedding-3-small",
            embeddingUrl = "https://embed.example/v1",
            embeddingKey = "embedding-secret-456"
        )

        val result = mutation.setUserSettings(
            apiKey = "...123",
            modelName = "gpt-4.1-mini",
            modelUrl = null,
            embeddingModel = "text-embedding-3-large",
            embeddingUrl = null,
            embeddingKey = "...456"
        )

        assertThat(result.apiKey).isEqualTo("...123")
        assertThat(result.embeddingKey).isEqualTo("...456")
        assertThat(result.modelName).isEqualTo("gpt-4.1-mini")
        assertThat(result.embeddingModel).isEqualTo("text-embedding-3-large")

        val stored = repository.get()
        assertThat(stored?.apiKey).isEqualTo("primary-secret-123")
        assertThat(stored?.embeddingKey).isEqualTo("embedding-secret-456")
        assertThat(stored?.modelName).isEqualTo("gpt-4.1-mini")
        assertThat(stored?.modelUrl).isNull()
        assertThat(stored?.embeddingModel).isEqualTo("text-embedding-3-large")
        assertThat(stored?.embeddingUrl).isNull()
    }
}

