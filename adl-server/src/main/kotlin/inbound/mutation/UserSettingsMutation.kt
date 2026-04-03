// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.mutation

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Mutation
import graphql.schema.DataFetchingEnvironment
import org.eclipse.lmos.adl.server.withRequestOwner
import org.eclipse.lmos.adl.server.models.UserSettings
import org.eclipse.lmos.adl.server.repositories.UserSettingsRepository
import org.eclipse.lmos.adl.server.services.UserDefinedCompleterProvider

class UserSettingsMutation(
    private val repository: UserSettingsRepository,
    private val completerProvider: UserDefinedCompleterProvider? = null
) : Mutation {

    @GraphQLDescription("Sets the user model and embedding settings. Returns the settings with secret keys masked (only last 3 chars visible).")
    suspend fun setUserSettings(
        @GraphQLDescription("The API key") apiKey: String,
        @GraphQLDescription("The model name") modelName: String,
        @GraphQLDescription("The model URL") modelUrl: String? = null,
        @GraphQLDescription("The embedding model name") embeddingModel: String? = null,
        @GraphQLDescription("The embedding model URL") embeddingUrl: String? = null,
        @GraphQLDescription("The embedding API key") embeddingKey: String? = null,
        environment: DataFetchingEnvironment? = null,
    ): UserSettings {
        return withRequestOwner(environment) {
            val existingSettings = repository.get()
            val settings = UserSettings(
                apiKey = resolveSecret(apiKey, existingSettings?.apiKey) ?: apiKey,
                modelName = modelName,
                modelUrl = modelUrl,
                embeddingModel = embeddingModel,
                embeddingUrl = embeddingUrl,
                embeddingKey = resolveSecret(embeddingKey, existingSettings?.embeddingKey)
            )
            val saved = repository.save(settings)
            completerProvider?.updateSettings(saved)
            maskApiKey(saved)
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

    private fun resolveSecret(incomingSecret: String?, existingSecret: String?): String? {
        if (incomingSecret == null) {
            return existingSecret
        }

        if (existingSecret != null && incomingSecret == maskSecret(existingSecret)) {
            return existingSecret
        }

        return incomingSecret
    }
}
