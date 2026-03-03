// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.models

import com.expediagroup.graphql.generator.annotations.GraphQLDescription

@GraphQLDescription("A diff between two versions of an ADL.")
data class AdlDiff(
    @GraphQLDescription("The ADL ID")
    val adlId: String,
    @GraphQLDescription("The source version number")
    val fromVersion: Int,
    @GraphQLDescription("The target version number")
    val toVersion: Int,
    @GraphQLDescription("The unified diff of the content")
    val contentDiff: String,
)
