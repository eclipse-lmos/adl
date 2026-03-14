// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import com.expediagroup.graphql.server.ktor.KtorGraphQLContextFactory
import graphql.GraphQLContext
import graphql.schema.DataFetchingEnvironment
import io.ktor.server.request.ApplicationRequest
import kotlinx.coroutines.ThreadContextElement
import kotlinx.coroutines.withContext
import kotlin.coroutines.AbstractCoroutineContextElement
import kotlin.coroutines.CoroutineContext

const val DEFAULT_OWNER = "public"
const val OWNER_CONTEXT_KEY = "owner"

private val ownerThreadLocal = ThreadLocal<String?>()

class OwnerCoroutineContext(
    private val owner: String,
) : ThreadContextElement<String?>, AbstractCoroutineContextElement(Key) {
    companion object Key : CoroutineContext.Key<OwnerCoroutineContext>

    override fun updateThreadContext(context: CoroutineContext): String? {
        val previous = ownerThreadLocal.get()
        ownerThreadLocal.set(owner)
        return previous
    }

    override fun restoreThreadContext(context: CoroutineContext, oldState: String?) {
        ownerThreadLocal.set(oldState)
    }
}

class DefaultKtorGraphQLContextFactory : KtorGraphQLContextFactory() {
    override suspend fun generateContext(request: ApplicationRequest): GraphQLContext {
        return GraphQLContext.newContext()
            .of(OWNER_CONTEXT_KEY, DEFAULT_OWNER)
            .build()
    }
}

fun DataFetchingEnvironment.owner(): String = graphQlContext.getOrDefault(OWNER_CONTEXT_KEY, DEFAULT_OWNER)

fun currentOwner(): String = ownerThreadLocal.get() ?: DEFAULT_OWNER

suspend fun <T> withOwner(owner: String, block: suspend () -> T): T {
    return withContext(OwnerCoroutineContext(owner)) { block() }
}

fun <T> withOwnerBlocking(owner: String, block: () -> T): T {
    val previous = ownerThreadLocal.get()
    ownerThreadLocal.set(owner)
    return try {
        block()
    } finally {
        ownerThreadLocal.set(previous)
    }
}

suspend fun <T> withRequestOwner(environment: DataFetchingEnvironment?, block: suspend () -> T): T {
    return withOwner(environment?.owner() ?: DEFAULT_OWNER, block)
}

fun <T> withRequestOwnerBlocking(environment: DataFetchingEnvironment?, block: () -> T): T {
    return withOwnerBlocking(environment?.owner() ?: DEFAULT_OWNER, block)
}

