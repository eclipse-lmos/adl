// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.models

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import org.eclipse.lmos.adl.server.DEFAULT_OWNER

@GraphQLDescription("User settings containing model and embedding configuration")
data class UserSettings(
    @param:GraphQLDescription("The API key. When retrieved, only the last 3 characters are visible.")
    val apiKey: String,

    @param:GraphQLDescription("The model name")
    val modelName: String,

    @param:GraphQLDescription("The URL of the model")
    val modelUrl: String? = null,

    @param:GraphQLDescription("The embedding model name")
    val embeddingModel: String? = null,

    @param:GraphQLDescription("The URL of the embedding model")
    val embeddingUrl: String? = null,

    @param:GraphQLDescription("The embedding API key. When retrieved, only the last 3 characters are visible.")
    val embeddingKey: String? = null,

    @param:GraphQLDescription("Owner of the user settings")
    val owner: String = DEFAULT_OWNER,
)
