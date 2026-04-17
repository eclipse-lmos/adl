// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import com.expediagroup.graphql.server.ktor.KtorGraphQLContextFactory
import graphql.GraphQLContext
import graphql.schema.DataFetchingEnvironment
import io.ktor.http.Headers
import io.ktor.server.request.ApplicationRequest
import kotlinx.coroutines.ThreadContextElement
import kotlinx.coroutines.withContext
import org.eclipse.lmos.adl.server.repositories.OrganizationRepository
import kotlin.coroutines.AbstractCoroutineContextElement
import kotlin.coroutines.CoroutineContext

const val DEFAULT_OWNER = "public"
const val OWNER_CONTEXT_KEY = "owner"
const val OWNER_ACCESS_CONTEXT_KEY = "ownerAccess"
const val ORGANIZATION_API_KEY_HEADER = "X-Api-Key"
const val LEGACY_ORGANIZATION_API_KEY_HEADER = "X-Organization-Api-Key"
const val ORGANIZATION_ID_HEADER = "X-Organization-Id"

private val ownerThreadLocal = ThreadLocal<String?>()

/**
 * Structured result of resolving the request owner from inbound headers.
 */
data class OwnerAccess(
    val owner: String,
    val requestedOrganizationId: String? = null,
    val failure: OwnerAccessFailure? = null,
)

/**
 * Authorization failure information for owner resolution.
 */
data class OwnerAccessFailure(
    val statusCode: Int,
    val message: String,
)

/**
 * Resolves request owners from organization headers and API keys.
 */
class OwnerAccessResolver(
    private val organizationRepository: OrganizationRepository,
    private val organizationSessionCookieManager: OrganizationSessionCookieManager,
) {
    suspend fun resolve(request: ApplicationRequest): OwnerAccess = resolve(
        headers = request.headers,
        sessionCookieValue = request.cookies[ORGANIZATION_SESSION_COOKIE_NAME],
    )

    suspend fun resolve(headers: Headers): OwnerAccess {
        return resolve(headers, sessionCookieValue = null)
    }

    private suspend fun resolve(
        headers: Headers,
        sessionCookieValue: String?,
    ): OwnerAccess {
        val requestedOrganizationId = headers[ORGANIZATION_ID_HEADER]?.trim()?.takeIf { it.isNotBlank() }
        val headerApiKey = sequenceOf(ORGANIZATION_API_KEY_HEADER, LEGACY_ORGANIZATION_API_KEY_HEADER)
            .mapNotNull { header -> headers[header]?.trim()?.takeIf { it.isNotBlank() } }
            .firstOrNull()

        if (headerApiKey != null) {
            return resolveApiKeyAccess(rawApiKey = headerApiKey, requestedOrganizationId = requestedOrganizationId)
        }

        if (requestedOrganizationId == DEFAULT_OWNER) {
            return OwnerAccess(owner = DEFAULT_OWNER, requestedOrganizationId = requestedOrganizationId)
        }

        val sessionApiKey = organizationSessionCookieManager.resolveApiKey(sessionCookieValue)
        if (sessionApiKey != null) {
            return resolveApiKeyAccess(rawApiKey = sessionApiKey, requestedOrganizationId = requestedOrganizationId)
        }

        if (!sessionCookieValue.isNullOrBlank() && requestedOrganizationId != null && requestedOrganizationId != DEFAULT_OWNER) {
            return OwnerAccess(
                owner = DEFAULT_OWNER,
                requestedOrganizationId = requestedOrganizationId,
                failure = OwnerAccessFailure(statusCode = 403, message = "Invalid or revoked organization API key."),
            )
        }

        if (requestedOrganizationId != null && requestedOrganizationId != DEFAULT_OWNER) {
            return OwnerAccess(
                owner = DEFAULT_OWNER,
                requestedOrganizationId = requestedOrganizationId,
                failure = OwnerAccessFailure(statusCode = 401, message = "Missing organization API key."),
            )
        }

        return OwnerAccess(owner = DEFAULT_OWNER, requestedOrganizationId = requestedOrganizationId)
    }

    private suspend fun resolveApiKeyAccess(
        rawApiKey: String,
        requestedOrganizationId: String?,
    ): OwnerAccess {
        val organization = organizationRepository.resolveByApiKey(rawApiKey)
                ?: return OwnerAccess(
                    owner = DEFAULT_OWNER,
                    requestedOrganizationId = requestedOrganizationId,
                    failure = OwnerAccessFailure(statusCode = 403, message = "Invalid or revoked organization API key."),
                )

            if (requestedOrganizationId != null && requestedOrganizationId != organization.id) {
                return OwnerAccess(
                    owner = DEFAULT_OWNER,
                    requestedOrganizationId = requestedOrganizationId,
                    failure = OwnerAccessFailure(
                        statusCode = 403,
                        message = "Organization API key does not match the requested organization.",
                    ),
                )
            }

        return OwnerAccess(owner = organization.id, requestedOrganizationId = requestedOrganizationId ?: organization.id)
    }
}

/**
 * Raised when an organization API key is missing for a protected request.
 */
class OwnerAuthenticationException(message: String) : RuntimeException(message)

/**
 * Raised when an organization API key is invalid or mismatched.
 */
class OwnerAuthorizationException(message: String) : RuntimeException(message)

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

/**
 * GraphQL context factory that resolves the current owner from inbound request headers.
 */
class DefaultKtorGraphQLContextFactory(
    private val ownerAccessResolver: OwnerAccessResolver,
) : KtorGraphQLContextFactory() {
    override suspend fun generateContext(request: ApplicationRequest): GraphQLContext {
        val ownerAccess = ownerAccessResolver.resolve(request)
        return GraphQLContext.newContext()
            .of(OWNER_CONTEXT_KEY, ownerAccess.owner)
            .of(OWNER_ACCESS_CONTEXT_KEY, ownerAccess)
            .build()
    }
}

fun DataFetchingEnvironment.owner(): String = graphQlContext.getOrDefault(OWNER_CONTEXT_KEY, DEFAULT_OWNER)

fun DataFetchingEnvironment.ownerAccess(): OwnerAccess = graphQlContext.getOrDefault(
    OWNER_ACCESS_CONTEXT_KEY,
    OwnerAccess(owner = owner()),
)

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
    val access = environment?.ownerAccess() ?: OwnerAccess(owner = DEFAULT_OWNER)
    access.ensureGranted()
    return withOwner(access.owner, block)
}

fun <T> withRequestOwnerBlocking(environment: DataFetchingEnvironment?, block: () -> T): T {
    val access = environment?.ownerAccess() ?: OwnerAccess(owner = DEFAULT_OWNER)
    access.ensureGranted()
    return withOwnerBlocking(access.owner, block)
}

suspend fun <T> withPublicAdministration(environment: DataFetchingEnvironment?, block: suspend () -> T): T {
    val access = environment?.ownerAccess() ?: OwnerAccess(owner = DEFAULT_OWNER)
    access.ensureGranted()
    if (access.owner != DEFAULT_OWNER) {
        throw OwnerAuthorizationException("Organization management is only available in public administration mode.")
    }
    return withOwner(DEFAULT_OWNER, block)
}

fun <T> withPublicAdministrationBlocking(environment: DataFetchingEnvironment?, block: () -> T): T {
    val access = environment?.ownerAccess() ?: OwnerAccess(owner = DEFAULT_OWNER)
    access.ensureGranted()
    if (access.owner != DEFAULT_OWNER) {
        throw OwnerAuthorizationException("Organization management is only available in public administration mode.")
    }
    return withOwnerBlocking(DEFAULT_OWNER, block)
}

fun OwnerAccess.ensureGranted() {
    val accessFailure = failure ?: return
    when (accessFailure.statusCode) {
        401 -> throw OwnerAuthenticationException(accessFailure.message)
        403 -> throw OwnerAuthorizationException(accessFailure.message)
        else -> throw IllegalStateException(accessFailure.message)
    }
}

