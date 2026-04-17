// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.inbound.rest

import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.eclipse.lmos.adl.server.ORGANIZATION_SESSION_COOKIE_NAME
import org.eclipse.lmos.adl.server.OrganizationSessionCookieManager
import org.eclipse.lmos.adl.server.repositories.OrganizationRepository
import org.slf4j.LoggerFactory

private val log = LoggerFactory.getLogger("OrganizationAccessSessionHandler")

/**
 * Exchanges organization API keys for encrypted HTTP-only session cookies.
 */
fun Route.organizationAccessSessions(
    organizationRepository: OrganizationRepository,
    organizationSessionCookieManager: OrganizationSessionCookieManager,
) {
    route("/api/organization-access/session") {
        post {
            log.info("Exchanging organization API key for secure cookie session")
            val requestBody = runCatching {
                Json.decodeFromString<OrganizationSessionExchangeRequest>(call.receive<String>())
            }.getOrNull()
            val rawApiKey = requestBody?.apiKey?.trim().orEmpty()
            if (rawApiKey.isBlank()) {
                call.respondText(
                    text = Json.encodeToString(OrganizationSessionErrorResponse("Organization API key is required.")),
                    contentType = ContentType.Application.Json,
                    status = HttpStatusCode.BadRequest,
                )
                return@post
            }

            val organization = organizationRepository.resolveByApiKey(rawApiKey)
            if (organization == null) {
                call.respondText(
                    text = Json.encodeToString(OrganizationSessionErrorResponse("Invalid or revoked organization API key.")),
                    contentType = ContentType.Application.Json,
                    status = HttpStatusCode.Forbidden,
                )
                return@post
            }

            call.response.headers.append(
                HttpHeaders.SetCookie,
                buildSessionCookieHeader(
                    cookieValue = organizationSessionCookieManager.createCookieValue(rawApiKey),
                    maxAgeSeconds = organizationSessionCookieManager.maxAgeSeconds(),
                    secure = requestScheme(call).equals("https", ignoreCase = true),
                ),
            )
            call.respondText(
                text = Json.encodeToString(
                    OrganizationSessionExchangeResponse(
                        organizationId = organization.id,
                        organizationName = organization.name,
                    ),
                ),
                contentType = ContentType.Application.Json,
                status = HttpStatusCode.OK,
            )
        }

        delete {
            log.info("Clearing organization access cookie session")
            call.response.headers.append(HttpHeaders.SetCookie, buildExpiredSessionCookieHeader())
            call.respondText(text = "", status = HttpStatusCode.NoContent)
        }
    }
}

private fun requestScheme(call: io.ktor.server.application.ApplicationCall): String {
    return call.request.headers["X-Forwarded-Proto"]
        ?.substringBefore(',')
        ?.trim()
        ?.takeIf { it.isNotBlank() }
        ?: call.request.local.scheme
}

private fun buildSessionCookieHeader(
    cookieValue: String,
    maxAgeSeconds: Long,
    secure: Boolean,
): String {
    val sameSite = if (secure) "None" else "Lax"
    return buildString {
        append("$ORGANIZATION_SESSION_COOKIE_NAME=$cookieValue")
        append("; Path=/")
        append("; Max-Age=$maxAgeSeconds")
        append("; HttpOnly")
        append("; SameSite=$sameSite")
        if (secure) {
            append("; Secure")
        }
    }
}

private fun buildExpiredSessionCookieHeader(): String = buildString {
    append("$ORGANIZATION_SESSION_COOKIE_NAME=")
    append("; Path=/")
    append("; Max-Age=0")
    append("; HttpOnly")
    append("; SameSite=Lax")
}

@Serializable
private data class OrganizationSessionExchangeRequest(
    val apiKey: String,
)

@Serializable
private data class OrganizationSessionExchangeResponse(
    val organizationId: String,
    val organizationName: String,
)

@Serializable
private data class OrganizationSessionErrorResponse(
    val message: String,
)

