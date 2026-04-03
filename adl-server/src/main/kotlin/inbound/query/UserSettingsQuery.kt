// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.query

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Query
import graphql.schema.DataFetchingEnvironment
import org.eclipse.lmos.adl.server.withRequestOwner
import org.eclipse.lmos.adl.server.models.UserSettings
import org.eclipse.lmos.adl.server.repositories.UserSettingsRepository

class UserSettingsQuery(
    private val repository: UserSettingsRepository
) : Query {

    @GraphQLDescription("Retrieves the user settings. Secret keys are masked.")
    suspend fun userSettings(environment: DataFetchingEnvironment? = null): UserSettings? {
        return withRequestOwner(environment) {
            val settings = repository.get() ?: return@withRequestOwner null
            maskApiKey(settings)
        }
    }

    private fun maskApiKey(settings: UserSettings): UserSettings {
        return settings.copy(
            apiKey = maskSecret(settings.apiKey),
            embeddingKey = settings.embeddingKey?.let(::maskSecret)
        )
    }

    private fun maskSecret(secret: String): String {
        return if (secret.length <= 3) {
            secret
        } else {
            "..." + secret.takeLast(3)
        }
    }
}

