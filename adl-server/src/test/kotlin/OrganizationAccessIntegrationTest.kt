// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO as ClientCIO
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.sse.SSE
import io.ktor.client.request.accept
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.prepareGet
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.cio.CIOApplicationEngine
import io.ktor.server.engine.EmbeddedServer
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class OrganizationAccessIntegrationTest {

    private val testPort = 18082
    private val baseUrl = "http://localhost:$testPort"
    private lateinit var client: HttpClient
    private lateinit var server: EmbeddedServer<CIOApplicationEngine, CIOApplicationEngine.Configuration>

    private val json = Json {
        ignoreUnknownKeys = true
    }

    @BeforeEach
    fun setUp() {
        server = startServer(wait = false, port = testPort)
        client = HttpClient(ClientCIO) {
            install(HttpTimeout) {
                requestTimeoutMillis = 5_000
                connectTimeoutMillis = 5_000
                socketTimeoutMillis = 5_000
            }
            install(SSE)
        }
    }

    @AfterEach
    fun tearDown() {
        client.close()
        server.stop(1_000, 2_000)
    }

    @Test
    fun `graphQL owner scoped operations require valid organization api key when organization is requested`() = runBlocking {
        val createdApiKey = createOrganizationAndReturnApiKey("telekom-demo")

        val unauthorizedResponse = executeGraphQl(
            query = "query { searchById(id: \"demo-adl\") { id } }",
            headers = mapOf(ORGANIZATION_ID_HEADER to "telekom-demo"),
        )
        val unauthorizedError = json.parseToJsonElement(unauthorizedResponse.bodyAsText())
            .jsonObject["errors"]!!.jsonArray.first().jsonObject["message"]!!.jsonPrimitive.content
        assertEquals(HttpStatusCode.OK, unauthorizedResponse.status)
        assertEquals("Missing organization API key.", unauthorizedError)

        val forbiddenResponse = executeGraphQl(
            query = "query { searchById(id: \"demo-adl\") { id } }",
            headers = mapOf(
                ORGANIZATION_ID_HEADER to "telekom-demo",
                ORGANIZATION_API_KEY_HEADER to "invalid-key",
            ),
        )
        val forbiddenError = json.parseToJsonElement(forbiddenResponse.bodyAsText())
            .jsonObject["errors"]!!.jsonArray.first().jsonObject["message"]!!.jsonPrimitive.content
        assertEquals("Invalid or revoked organization API key.", forbiddenError)

        executeGraphQl(
            query = "mutation { store(id: \"demo-adl\", content: ${graphqlBlockString("### UseCase: demo\n#### Description\nPublic\n#### Solution\nPublic\n----")}, tags: [\"public\"], examples: []) { message } }",
        )

        executeGraphQl(
            query = "mutation { store(id: \"demo-adl\", content: ${graphqlBlockString("### UseCase: demo\n#### Description\nOrganization\n#### Solution\nOrganization\n----")}, tags: [\"org\"], examples: []) { message } }",
            headers = organizationHeaders("telekom-demo", createdApiKey),
        )

        val publicLookup = executeGraphQl("query { searchById(id: \"demo-adl\") { content owner } }")
        val orgLookup = executeGraphQl(
            query = "query { searchById(id: \"demo-adl\") { content owner } }",
            headers = organizationHeaders("telekom-demo", createdApiKey),
        )

        val publicAdl = json.parseToJsonElement(publicLookup.bodyAsText()).jsonObject["data"]!!.jsonObject["searchById"]!!.jsonObject
        val orgAdl = json.parseToJsonElement(orgLookup.bodyAsText()).jsonObject["data"]!!.jsonObject["searchById"]!!.jsonObject

        assertTrue(publicAdl["content"]!!.jsonPrimitive.content.contains("Public"))
        assertEquals(DEFAULT_OWNER, publicAdl["owner"]!!.jsonPrimitive.content)
        assertTrue(orgAdl["content"]!!.jsonPrimitive.content.contains("Organization"))
        assertEquals("telekom-demo", orgAdl["owner"]!!.jsonPrimitive.content)
    }

    @Test
    fun `organization queries only expose public and currently authorized organization`() = runBlocking {
        val telekomApiKey = createOrganizationAndReturnApiKey("telekom-demo")
        createOrganizationAndReturnApiKey("secret-org")

        val publicOrganizations = executeGraphQl("query { organizations { id } }")
        val publicOrganizationIds = json.parseToJsonElement(publicOrganizations.bodyAsText())
            .jsonObject["data"]!!.jsonObject["organizations"]!!.jsonArray
            .map { it.jsonObject["id"]!!.jsonPrimitive.content }

        assertEquals(listOf(DEFAULT_OWNER), publicOrganizationIds)

        val authorizedOrganizations = executeGraphQl(
            query = "query { organizations { id } }",
            headers = organizationHeaders("telekom-demo", telekomApiKey),
        )
        val authorizedOrganizationIds = json.parseToJsonElement(authorizedOrganizations.bodyAsText())
            .jsonObject["data"]!!.jsonObject["organizations"]!!.jsonArray
            .map { it.jsonObject["id"]!!.jsonPrimitive.content }

        assertEquals(listOf(DEFAULT_OWNER, "telekom-demo"), authorizedOrganizationIds)

        val hiddenOrganizationLookup = executeGraphQl(
            query = "query { organization(id: \"secret-org\") { id name } }",
            headers = organizationHeaders("telekom-demo", telekomApiKey),
        )
        val hiddenOrganization = json.parseToJsonElement(hiddenOrganizationLookup.bodyAsText())
            .jsonObject["data"]!!.jsonObject["organization"]

        assertTrue(hiddenOrganization == null || hiddenOrganization.toString() == "null")
    }

    @Test
    fun `create organization uses master as default initial api key label`() = runBlocking {
        val createResponse = executeGraphQl(
            query = "mutation { createOrganization(id: \"default-label-org\", name: \"Default Label Org\", descriptions: \"Test organization\") { createdApiKey organization { id } } }",
        )
        assertEquals(HttpStatusCode.OK, createResponse.status)

        val createPayload = json.parseToJsonElement(createResponse.bodyAsText()).jsonObject
        val createdOrganization = createPayload["data"]!!.jsonObject["createOrganization"]!!.jsonObject
        val createdApiKey = createdOrganization["createdApiKey"]!!.jsonPrimitive.content

        val organizationResponse = executeGraphQl(
            query = "query { organization(id: \"default-label-org\") { apiKeys { label maskedKey revoked } } }",
            headers = organizationHeaders("default-label-org", createdApiKey),
        )
        assertEquals(HttpStatusCode.OK, organizationResponse.status)

        val apiKeys = json.parseToJsonElement(organizationResponse.bodyAsText())
            .jsonObject["data"]!!.jsonObject["organization"]!!.jsonObject["apiKeys"]!!.jsonArray
        val activeApiKey = apiKeys.first { !it.jsonObject["revoked"]!!.jsonPrimitive.content.toBoolean() }.jsonObject

        assertEquals("master", activeApiKey["label"]!!.jsonPrimitive.content)
        assertNotEquals(createdApiKey, activeApiKey["maskedKey"]!!.jsonPrimitive.content)
    }

    @Test
    fun `last organization api key must be rotated instead of revoked`() = runBlocking {
        val createdApiKey = createOrganizationAndReturnApiKey("rotate-org")

        val revokeLastKey = executeGraphQl(
            query = "mutation { revokeOrganizationApiKey(organizationId: \"rotate-org\", apiKeyId: \"${findOrganizationApiKeyId("rotate-org", createdApiKey)}\") { id } }",
        )
        val revokeError = json.parseToJsonElement(revokeLastKey.bodyAsText())
            .jsonObject["errors"]!!.jsonArray.first().jsonObject["message"]!!.jsonPrimitive.content
        assertEquals(
            "Organizations must retain at least one active API key. Rotate the last key instead of revoking it.",
            revokeError,
        )

        val rotateKey = executeGraphQl(
            query = "mutation { rotateOrganizationApiKey(organizationId: \"rotate-org\", apiKeyId: \"${findOrganizationApiKeyId("rotate-org", createdApiKey)}\") { createdApiKey } }",
        )
        val rotatedApiKey = json.parseToJsonElement(rotateKey.bodyAsText())
            .jsonObject["data"]!!.jsonObject["rotateOrganizationApiKey"]!!.jsonObject["createdApiKey"]!!.jsonPrimitive.content

        val oldKeyResult = executeGraphQl(
            query = "query { organizations { id } }",
            headers = organizationHeaders("rotate-org", createdApiKey),
        )
        val oldKeyError = json.parseToJsonElement(oldKeyResult.bodyAsText())
            .jsonObject["errors"]!!.jsonArray.first().jsonObject["message"]!!.jsonPrimitive.content
        assertEquals("Invalid or revoked organization API key.", oldKeyError)

        val newKeyResult = executeGraphQl(
            query = "query { organizations { id } }",
            headers = organizationHeaders("rotate-org", rotatedApiKey),
        )
        val organizationIds = json.parseToJsonElement(newKeyResult.bodyAsText())
            .jsonObject["data"]!!.jsonObject["organizations"]!!.jsonArray
            .map { it.jsonObject["id"]!!.jsonPrimitive.content }
        assertEquals(listOf(DEFAULT_OWNER, "rotate-org"), organizationIds)
    }

    @Test
    fun `delete organization invalidates api keys and hides deleted organization`() = runBlocking {
        val createdApiKey = createOrganizationAndReturnApiKey("delete-org")

        executeGraphQl(
            query = "mutation { store(id: \"delete-adl\", content: ${graphqlBlockString("### UseCase: delete\n#### Solution\nDone\n----")}, tags: [\"demo\"], examples: [\"hello\"]) { message } }",
            headers = organizationHeaders("delete-org", createdApiKey),
        )

        val deleteResponse = executeGraphQl(
            query = "mutation { deleteOrganization(id: \"delete-org\") }",
        )
        val deleteSucceeded = json.parseToJsonElement(deleteResponse.bodyAsText())
            .jsonObject["data"]!!.jsonObject["deleteOrganization"]!!.jsonPrimitive.content.toBoolean()
        assertTrue(deleteSucceeded)

        val deletedKeyQuery = executeGraphQl(
            query = "query { organizations { id } }",
            headers = organizationHeaders("delete-org", createdApiKey),
        )
        val deletedKeyError = json.parseToJsonElement(deletedKeyQuery.bodyAsText())
            .jsonObject["errors"]!!.jsonArray.first().jsonObject["message"]!!.jsonPrimitive.content
        assertEquals("Invalid or revoked organization API key.", deletedKeyError)

        val publicOrganizations = executeGraphQl("query { organizations { id } }")
        val publicOrganizationIds = json.parseToJsonElement(publicOrganizations.bodyAsText())
            .jsonObject["data"]!!.jsonObject["organizations"]!!.jsonArray
            .map { it.jsonObject["id"]!!.jsonPrimitive.content }
        assertEquals(listOf(DEFAULT_OWNER), publicOrganizationIds)
    }

    @Test
    fun `openai compatible rest endpoint enforces organization api keys`() = runBlocking {
        val createdApiKey = createOrganizationAndReturnApiKey("rest-org")

        val missingKey = client.post("$baseUrl/v1/chat/completions") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            header(ORGANIZATION_ID_HEADER, "rest-org")
            setBody("{}")
        }
        assertEquals(HttpStatusCode.Unauthorized, missingKey.status)

        val invalidKey = client.post("$baseUrl/v1/chat/completions") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            header(ORGANIZATION_ID_HEADER, "rest-org")
            header(ORGANIZATION_API_KEY_HEADER, "invalid-key")
            setBody("{}")
        }
        assertEquals(HttpStatusCode.Forbidden, invalidKey.status)

        val validKey = client.post("$baseUrl/v1/chat/completions") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            header(ORGANIZATION_ID_HEADER, "rest-org")
            header(ORGANIZATION_API_KEY_HEADER, createdApiKey)
            setBody("{invalid-json")
        }
        assertNotEquals(HttpStatusCode.Unauthorized, validKey.status)
        assertNotEquals(HttpStatusCode.Forbidden, validKey.status)
    }

    @Test
    fun `sse endpoint enforces organization api keys`() = runBlocking {
        val createdApiKey = createOrganizationAndReturnApiKey("events-org")

        client.prepareGet("$baseUrl/events") {
            header(ORGANIZATION_ID_HEADER, "events-org")
            accept(ContentType.Text.EventStream)
        }.execute { response ->
            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

        client.prepareGet("$baseUrl/events") {
            header(ORGANIZATION_ID_HEADER, "events-org")
            header(ORGANIZATION_API_KEY_HEADER, "invalid-key")
            accept(ContentType.Text.EventStream)
        }.execute { response ->
            assertEquals(HttpStatusCode.Forbidden, response.status)
        }

        client.prepareGet("$baseUrl/events") {
            header(ORGANIZATION_ID_HEADER, "events-org")
            header(ORGANIZATION_API_KEY_HEADER, createdApiKey)
            accept(ContentType.Text.EventStream)
        }.execute { response ->
            assertEquals(HttpStatusCode.OK, response.status)
        }
    }

    private suspend fun createOrganizationAndReturnApiKey(organizationId: String): String {
        val response = executeGraphQl(
            query = "mutation { createOrganization(id: \"$organizationId\", name: \"$organizationId\", descriptions: \"Test organization\", initialApiKeyLabel: \"studio\") { createdApiKey } }",
        )
        assertEquals(HttpStatusCode.OK, response.status)
        val payload = json.parseToJsonElement(response.bodyAsText()).jsonObject
        assertNotNull(payload["data"], "Expected GraphQL data payload but got: $payload")
        return payload["data"]!!.jsonObject["createOrganization"]!!.jsonObject["createdApiKey"]!!.jsonPrimitive.content
    }

    private suspend fun findOrganizationApiKeyId(organizationId: String, apiKey: String): String {
        val response = executeGraphQl(
            query = "query { organization(id: \"$organizationId\") { apiKeys { id revoked } } }",
            headers = organizationHeaders(organizationId, apiKey),
        )
        val apiKeys = json.parseToJsonElement(response.bodyAsText())
            .jsonObject["data"]!!.jsonObject["organization"]!!.jsonObject["apiKeys"]!!.jsonArray

        return apiKeys.first { apiKeyRecord -> !apiKeyRecord.jsonObject["revoked"]!!.jsonPrimitive.content.toBoolean() }
            .jsonObject["id"]!!.jsonPrimitive.content
    }

    private suspend fun executeGraphQl(
        query: String,
        headers: Map<String, String> = emptyMap(),
    ) = client.post("$baseUrl/graphql") {
        header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
        headers.forEach { (headerName, headerValue) -> header(headerName, headerValue) }
        setBody("""{"query": ${json.encodeToString(query)}}""")
    }

    private fun organizationHeaders(organizationId: String, apiKey: String): Map<String, String> = mapOf(
        ORGANIZATION_ID_HEADER to organizationId,
        ORGANIZATION_API_KEY_HEADER to apiKey,
    )

    private fun graphqlBlockString(value: String): String = "\"\"\"${value.replace("\"\"\"", "\\\"\\\"\\\"")}\"\"\""
}

