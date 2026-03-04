package org.eclipse.lmos.arc.mcp

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import io.ktor.util.collections.*
import io.modelcontextprotocol.kotlin.sdk.server.*
import io.modelcontextprotocol.kotlin.sdk.types.Implementation
import io.modelcontextprotocol.kotlin.sdk.types.ServerCapabilities
import kotlinx.coroutines.Job
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.runBlocking
import kotlinx.io.asSink
import kotlinx.io.asSource
import kotlinx.io.buffered
import org.eclipse.lmos.arc.mcp.prompts.SystemPrompt

private const val USE_CASE_PARAM = "useCase"

class McpServer {
    fun configureServer(): Server {
        val server = Server(
            Implementation(
                name = "Adl MCP server",
                version = "0.1.0",
            ),
            ServerOptions(
                capabilities = ServerCapabilities(
                    tools = ServerCapabilities.Tools(listChanged = true),
                    prompts = ServerCapabilities.Prompts(listChanged = true),
                ),
            ),
        )

        server.addPrompts(createSystemPrompts())

        return server
    }

    private fun createSystemPrompts(): List<RegisteredPrompt> {
        val systemPrompt: RegisteredPrompt = SystemPrompt().createSystemPrompt()
        return listOf(systemPrompt)
    }

}

fun runSseMcpServerWithPlainConfiguration(port: Int, wait: Boolean = true): EmbeddedServer<*, *> {
    printBanner(port = port, path = "/sse")
    val serverSessions = ConcurrentMap<String, ServerSession>()

    val mcpServer = McpServer()
    val server = mcpServer.configureServer()

    val ktorServer = embeddedServer(CIO, host = "127.0.0.1", port = port) {
        installCors()
        install(SSE)
        routing {
            sse("/sse") {
                val transport = SseServerTransport("/message", this)
                val serverSession = server.createSession(transport)
                serverSessions[transport.sessionId] = serverSession

                serverSession.onClose {
                    println("Server session closed for: ${transport.sessionId}")
                    serverSessions.remove(transport.sessionId)
                }

                awaitCancellation()
            }
            post("/message") {
                val sessionId: String? = call.request.queryParameters["sessionId"]
                if (sessionId == null) {
                    call.respond(HttpStatusCode.BadRequest, "Missing sessionId parameter")
                    return@post
                }

                val transport = serverSessions[sessionId]?.transport as? SseServerTransport
                if (transport == null) {
                    call.respond(HttpStatusCode.NotFound, "Session not found")
                    return@post
                }

                transport.handlePostMessage(call)
            }
        }
    }.start(wait = wait)

    return ktorServer
}

/**
 * Starts an SSE (Server-Sent Events) MCP server using the Ktor plugin.
 *
 * This is the recommended approach for SSE servers as it simplifies configuration.
 * The URL can be accessed in the MCP inspector at http://localhost:[port]/sse
 *
 * @param port The port number on which the SSE MCP server will listen for client connections.
 */
fun runSseMcpServerUsingKtorPlugin(port: Int, wait: Boolean = true): EmbeddedServer<*, *> {
    printBanner(port)

    val mcpServer = McpServer()
    val server = embeddedServer(CIO, host = "127.0.0.1", port = port) {
        installCors()
        mcp {
            return@mcp mcpServer.configureServer()
        }
    }.start(wait = wait)
    return server
}

private fun printBanner(port: Int, path: String = "") {
    if (port == 0) {
        println("🎬 Starting SSE server on random port")
    } else {
        println("🎬 Starting SSE server on ${if (port > 0) "port $port" else "random port"}")
        println("🔍 Use MCP inspector to connect to http://localhost:$port$path")
    }
}

private fun Application.installCors() {
    install(CORS) {
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Delete)
        allowNonSimpleContentTypes = true
        anyHost() // @TODO: Don't do this in production if possible. Try to limit it.
    }
}

/**
 * Starts an MCP server using Standard I/O transport.
 *
 * This mode is useful for process-based communication where the server
 * communicates via stdin/stdout with a parent process or client.
 */
fun runMcpServerUsingStdio() {
    val mcpServer = McpServer()
    val server = mcpServer.configureServer()
    val transport = StdioServerTransport(
        inputStream = System.`in`.asSource().buffered(),
        outputStream = System.out.asSink().buffered(),
    )

    runBlocking {
        server.createSession(transport)
        val done = Job()
        server.onClose {
            done.complete()
        }
        done.join()
    }
}

/**
 * Start sse-server mcp on port 3001.
 *
 * @param args
 * - "--stdio": Runs an MCP server using standard input/output.
 * - "--sse-server-ktor <port>": Runs an SSE MCP server using Ktor plugin (default if no argument is provided).
 * - "--sse-server <port>": Runs an SSE MCP server with a plain configuration.
 */
fun main(vararg args: String): Unit = runBlocking {
    val command = args.firstOrNull() ?: "--stdio"
    val port = args.getOrNull(1)?.toIntOrNull() ?: 3001
    when (command) {
        "--stdio" -> runMcpServerUsingStdio()
        "--sse-server-ktor" -> runSseMcpServerUsingKtorPlugin(port)
        "--sse-server" -> runSseMcpServerWithPlainConfiguration(port)
        else -> {
            error("Unknown command: $command")
        }
    }
}
