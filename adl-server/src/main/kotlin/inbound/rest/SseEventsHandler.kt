// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.inbound.rest

import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.application.call
import io.ktor.server.routing.Route
import io.ktor.server.routing.intercept
import io.ktor.server.routing.route
import org.eclipse.lmos.adl.server.OwnerAccessResolver
import org.eclipse.lmos.adl.server.ensureGranted
import org.eclipse.lmos.adl.server.services.ClientEventPublisher
import io.ktor.server.sse.*
import io.ktor.sse.*
import kotlin.time.Duration.Companion.seconds

fun Route.clientEvents(
    publisher: ClientEventPublisher,
    ownerAccessResolver: OwnerAccessResolver,
) {
    route("/events") {
        intercept(ApplicationCallPipeline.Plugins) {
            val ownerAccess = ownerAccessResolver.resolve(call.request)
            ownerAccess.ensureGranted()
        }

        sse {
            val ownerAccess = ownerAccessResolver.resolve(call.request)

            heartbeat {
                period = 5.seconds
                event = ServerSentEvent("heartbeat")
            }
            publisher.events.collect { event ->
                if (event.id == null || event.id == ownerAccess.owner) {
                    send(event)
                }
            }
        }
    }
}

