// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.models

import com.expediagroup.graphql.generator.annotations.GraphQLDescription

@GraphQLDescription("A version snapshot of an ADL.")
data class AdlVersion(
    @GraphQLDescription("The ADL ID")
    val adlId: String,
    @GraphQLDescription("The version number")
    val version: Int,
    @GraphQLDescription("The content at this version")
    val content: String,
    @GraphQLDescription("Tags at this version")
    val tags: List<String>,
    @GraphQLDescription("Examples at this version")
    val examples: List<String>,
    @GraphQLDescription("Output template at this version")
    val output: String?,
    @GraphQLDescription("When this version was created")
    val createdAt: String,
)
