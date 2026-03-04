// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.eclipse.lmos.adl.server.model.Adl
import org.eclipse.lmos.adl.server.repositories.impl.db.PostgresAdlRepository
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.testcontainers.DockerClientFactory
import org.testcontainers.containers.PostgreSQLContainer

@EnabledIf("isDockerAvailable", disabledReason = "Docker is not available")
class PostgresAdlRepositoryTest {

    companion object {
        @JvmStatic
        fun isDockerAvailable(): Boolean = try {
            DockerClientFactory.instance().isDockerAvailable
        } catch (_: Exception) { false }

        private val postgres = PostgreSQLContainer("postgres:17")

        private lateinit var dataSource: HikariDataSource
        private lateinit var repository: PostgresAdlRepository

        @JvmStatic
        @BeforeAll
        fun setup() {
            postgres.start()
            val config = HikariConfig().apply {
                jdbcUrl = postgres.jdbcUrl
                username = postgres.username
                password = postgres.password
                maximumPoolSize = 5
            }
            dataSource = HikariDataSource(config)
            Flyway.configure().dataSource(dataSource).load().migrate()
            repository = PostgresAdlRepository(dataSource)
        }

        @JvmStatic
        @AfterAll
        fun teardown() {
            if (postgres.isRunning) {
                dataSource.close()
                postgres.stop()
            }
        }
    }

    @BeforeEach
    fun cleanDb() {
        dataSource.connection.use { conn ->
            conn.createStatement().execute("DELETE FROM adl_versions")
            conn.createStatement().execute("DELETE FROM adls")
        }
    }

    @Test
    fun `store and retrieve ADL`() = runBlocking {
        val adl = Adl(
            id = "test-1",
            content = "# Test ADL",
            tags = listOf("tag1", "tag2"),
            createdAt = "2024-01-01T00:00:00Z",
            examples = listOf("example1", "example2"),
            output = "output template",
        )
        repository.store(adl)

        val retrieved = repository.get("test-1")
        assertThat(retrieved).isNotNull
        assertThat(retrieved!!.id).isEqualTo("test-1")
        assertThat(retrieved.content).isEqualTo("# Test ADL")
        assertThat(retrieved.tags).containsExactly("tag1", "tag2")
        assertThat(retrieved.examples).containsExactly("example1", "example2")
        assertThat(retrieved.output).isEqualTo("output template")
        assertThat(retrieved.version).isEqualTo("1")
    }

    @Test
    fun `list all ADLs`() = runBlocking {
        repository.store(Adl("a", "content-a", listOf("t1"), "2024-01-01T00:00:00Z"))
        repository.store(Adl("b", "content-b", listOf("t2"), "2024-01-01T00:00:00Z"))

        val list = repository.list()
        assertThat(list).hasSize(2)
        assertThat(list.map { it.id }).containsExactlyInAnyOrder("a", "b")
    }

    @Test
    fun `delete ADL`() = runBlocking {
        repository.store(Adl("del-1", "content", listOf(), "2024-01-01T00:00:00Z"))
        assertThat(repository.get("del-1")).isNotNull

        repository.deleteById("del-1")
        assertThat(repository.get("del-1")).isNull()
    }

    @Test
    fun `update ADL increments version and creates history`() = runBlocking {
        val adl = Adl("ver-1", "original content", listOf("v1"), "2024-01-01T00:00:00Z")
        repository.store(adl)

        val updated = adl.copy(content = "updated content", tags = listOf("v1", "v2"))
        repository.store(updated)

        val current = repository.get("ver-1")
        assertThat(current!!.version).isEqualTo("2")
        assertThat(current.content).isEqualTo("updated content")
        assertThat(current.tags).containsExactly("v1", "v2")

        val history = repository.getVersionHistory("ver-1")
        assertThat(history).hasSize(1)
        assertThat(history[0].version).isEqualTo(1)
        assertThat(history[0].content).isEqualTo("original content")
        assertThat(history[0].tags).containsExactly("v1")
    }

    @Test
    fun `multiple updates create full version history`() = runBlocking {
        repository.store(Adl("ver-2", "v1 content", listOf(), "2024-01-01T00:00:00Z"))
        repository.store(Adl("ver-2", "v2 content", listOf(), "2024-01-01T00:00:00Z"))
        repository.store(Adl("ver-2", "v3 content", listOf(), "2024-01-01T00:00:00Z"))

        val current = repository.get("ver-2")
        assertThat(current!!.version).isEqualTo("3")
        assertThat(current.content).isEqualTo("v3 content")

        val history = repository.getVersionHistory("ver-2")
        assertThat(history).hasSize(2)
        assertThat(history[0].version).isEqualTo(2) // newest first
        assertThat(history[0].content).isEqualTo("v2 content")
        assertThat(history[1].version).isEqualTo(1)
        assertThat(history[1].content).isEqualTo("v1 content")
    }

    @Test
    fun `getVersion returns specific version`() = runBlocking {
        repository.store(Adl("ver-3", "first", listOf("a"), "2024-01-01T00:00:00Z"))
        repository.store(Adl("ver-3", "second", listOf("a", "b"), "2024-01-01T00:00:00Z"))

        val v1 = repository.getVersion("ver-3", 1)
        assertThat(v1).isNotNull
        assertThat(v1!!.content).isEqualTo("first")
        assertThat(v1.tags).containsExactly("a")

        val v99 = repository.getVersion("ver-3", 99)
        assertThat(v99).isNull()
    }

    @Test
    fun `delete cascades to version history`() = runBlocking {
        repository.store(Adl("cas-1", "v1", listOf(), "2024-01-01T00:00:00Z"))
        repository.store(Adl("cas-1", "v2", listOf(), "2024-01-01T00:00:00Z"))
        assertThat(repository.getVersionHistory("cas-1")).hasSize(1)

        repository.deleteById("cas-1")
        assertThat(repository.getVersionHistory("cas-1")).isEmpty()
    }
}
