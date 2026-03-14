// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.query

import com.expediagroup.graphql.generator.annotations.GraphQLDescription
import com.expediagroup.graphql.server.operations.Query
import graphql.schema.DataFetchingEnvironment
import org.eclipse.lmos.adl.server.withRequestOwner
import org.eclipse.lmos.adl.server.models.TestRunResult
import org.eclipse.lmos.adl.server.repositories.TestRunRepository
import org.slf4j.LoggerFactory

/**
 * GraphQL query for listing and reading persisted test runs.
 */
@GraphQLDescription("GraphQL Query for persisted test run history.")
class TestRunQuery(
    private val testRunRepository: TestRunRepository,
) : Query {
    private val log = LoggerFactory.getLogger(this::class.java)

    /**
     * Lists persisted test runs for an ADL in the current owner scope.
     */
    @GraphQLDescription("Fetches persisted test runs for a given ADL identifier.")
    suspend fun testRuns(
        @GraphQLDescription("The ADL identifier.") adlId: String,
        @GraphQLDescription("Maximum number of results to return.") limit: Int = 20,
        environment: DataFetchingEnvironment? = null,
    ): List<TestRunResult> {
        log.info("Listing persisted test runs for ADL {} with limit {}", adlId, limit)
        return withRequestOwner(environment) { testRunRepository.findByAdlId(adlId, limit.coerceIn(1, 100)) }
    }

    /**
     * Loads one persisted test run in the current owner scope.
     */
    @GraphQLDescription("Fetches a persisted test run by its identifier.")
    suspend fun testRun(
        @GraphQLDescription("The persisted test run identifier.") id: String,
        environment: DataFetchingEnvironment? = null,
    ): TestRunResult? {
        log.info("Loading persisted test run {}", id)
        return withRequestOwner(environment) { testRunRepository.findById(id) }
    }
}

