// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server

// import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel
import com.expediagroup.graphql.server.ktor.GraphQL
import com.expediagroup.graphql.server.ktor.defaultGraphQLStatusPages
import com.expediagroup.graphql.server.ktor.graphQLPostRoute
import com.expediagroup.graphql.server.ktor.graphiQLRoute
import dev.langchain4j.model.embedding.onnx.bgesmallenv15q.BgeSmallEnV15QuantizedEmbeddingModel
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.http.content.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import kotlinx.coroutines.runBlocking
import org.eclipse.lmos.adl.server.agents.createAssistantAgent
import org.eclipse.lmos.adl.server.agents.createEvalAgent
import org.eclipse.lmos.adl.server.agents.createExampleAgent
import org.eclipse.lmos.adl.server.agents.createImprovementAgent
import org.eclipse.lmos.adl.server.agents.createSpellingAgent
import org.eclipse.lmos.adl.server.agents.createTestCreatorAgent
import org.eclipse.lmos.adl.server.agents.createTestVariantCreatorAgent
import org.eclipse.lmos.adl.server.agents.createWidgetCreatorAgent
import org.eclipse.lmos.adl.server.inbound.GlobalExceptionHandler
import org.eclipse.lmos.adl.server.inbound.mutation.AdlAssistantMutation
import org.eclipse.lmos.adl.server.inbound.mutation.AdlCompilerMutation
import org.eclipse.lmos.adl.server.inbound.mutation.AdlEvalMutation
import org.eclipse.lmos.adl.server.inbound.mutation.AdlExampleMutation
import org.eclipse.lmos.adl.server.inbound.mutation.AdlStorageMutation
import org.eclipse.lmos.adl.server.inbound.mutation.AdlValidationMutation
import org.eclipse.lmos.adl.server.inbound.mutation.AgentMutation
import org.eclipse.lmos.adl.server.inbound.mutation.McpMutation
import org.eclipse.lmos.adl.server.inbound.mutation.OrganizationMutation
import org.eclipse.lmos.adl.server.inbound.mutation.RolePromptMutation
import org.eclipse.lmos.adl.server.inbound.mutation.SpellingMutation
import org.eclipse.lmos.adl.server.inbound.mutation.SystemPromptMutation
import org.eclipse.lmos.adl.server.inbound.mutation.TestCreatorMutation
import org.eclipse.lmos.adl.server.inbound.mutation.UseCaseImprovementMutation
import org.eclipse.lmos.adl.server.inbound.mutation.UserSettingsMutation
import org.eclipse.lmos.adl.server.inbound.mutation.WidgetsMutation
import org.eclipse.lmos.adl.server.inbound.query.AdlQuery
import org.eclipse.lmos.adl.server.inbound.query.AgentQuery
import org.eclipse.lmos.adl.server.inbound.query.DashboardQuery
import org.eclipse.lmos.adl.server.inbound.query.McpToolsQuery
import org.eclipse.lmos.adl.server.inbound.query.OrganizationQuery
import org.eclipse.lmos.adl.server.inbound.query.RolePromptQuery
import org.eclipse.lmos.adl.server.inbound.query.TestCaseQuery
import org.eclipse.lmos.adl.server.inbound.query.TestRunQuery
import org.eclipse.lmos.adl.server.inbound.query.UserSettingsQuery
import org.eclipse.lmos.adl.server.inbound.query.WidgetQuery
import org.eclipse.lmos.adl.server.inbound.query.TagsQuery
import org.eclipse.lmos.adl.server.inbound.rest.clientEvents
import org.eclipse.lmos.adl.server.inbound.rest.openAICompletions
import org.eclipse.lmos.adl.server.repositories.AdlRepository
import org.eclipse.lmos.adl.server.repositories.AgentRepository
import org.eclipse.lmos.adl.server.repositories.OrganizationRepository
import org.eclipse.lmos.adl.server.repositories.RolePromptRepository
import org.eclipse.lmos.adl.server.repositories.TestRunRepository
import org.eclipse.lmos.adl.server.repositories.UseCaseEmbeddingsRepository
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemAdlRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAdlRepository
import org.eclipse.lmos.adl.server.repositories.impl.db.PostgresAdlRepository
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.flywaydb.core.Flyway
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryAgentRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryOrganizationRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryRolePromptRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryStatisticsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestCaseRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryUseCaseEmbeddingsStore
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryUserSettingsRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryWidgetRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTestRunRepository
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemWidgetRepository
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemTestCaseRepository
import org.eclipse.lmos.adl.server.repositories.impl.FileSystemTestRunRepository
import org.eclipse.lmos.adl.server.repositories.impl.InMemoryTagRepository
import org.eclipse.lmos.adl.server.repositories.impl.db.PostgresOrganizationRepository
import org.eclipse.lmos.adl.server.repositories.impl.db.PostgresTestRunRepository
import org.eclipse.lmos.adl.server.services.ClientEventPublisher
import org.eclipse.lmos.adl.server.services.ConversationEvaluator
import org.eclipse.lmos.adl.server.services.McpService
import org.eclipse.lmos.adl.server.services.OrganizationLifecycle
import org.eclipse.lmos.adl.server.services.TestExecutor
import org.eclipse.lmos.adl.server.services.UserDefinedCompleterProvider
import org.eclipse.lmos.adl.server.sessions.InMemorySessions
import org.eclipse.lmos.adl.server.templates.TemplateLoader
import java.io.File

internal data class FileRepositoryFolders(
    val adlFolder: File?,
    val widgetFolder: File?,
    val testCaseFolder: File?,
    val testRunFolder: File?,
)

internal fun resolveFileRepositoryFolders(
    adlFolderOverride: String?,
    widgetFolderOverride: String?,
    testCaseFolderOverride: String?,
    testRunFolderOverride: String?,
    localAdlFolder: File = File("adls"),
): FileRepositoryFolders {
    val adlFolder = adlFolderOverride?.let(::File) ?: localAdlFolder.takeIf { it.exists() }
    val widgetFolder = widgetFolderOverride?.let(::File) ?: adlFolder?.resolve("widgets")
    val testCaseFolder = testCaseFolderOverride?.let(::File) ?: adlFolder?.resolve("test-cases")
    val testRunFolder = testRunFolderOverride?.let(::File) ?: adlFolder?.resolve("test-runs")

    return FileRepositoryFolders(
        adlFolder = adlFolder,
        widgetFolder = widgetFolder,
        testCaseFolder = testCaseFolder,
        testRunFolder = testRunFolder,
    )
}

fun startServer(
    wait: Boolean = true,
    port: Int? = null,
    qdrantConfig: QdrantConfig = QdrantConfig(),
    module: Application.() -> Unit = {},
): EmbeddedServer<CIOApplicationEngine, CIOApplicationEngine.Configuration> {
    // Dependencies
    val fileRepositoryFolders = resolveFileRepositoryFolders(
        adlFolderOverride = EnvConfig.adlFolder,
        widgetFolderOverride = EnvConfig.widgetFolder,
        testCaseFolderOverride = EnvConfig.testCaseFolder,
        testRunFolderOverride = EnvConfig.testRunFolder,
    )
    val templateLoader = TemplateLoader()
    val sessions = InMemorySessions()
    // val embeddingModel = AllMiniLmL6V2EmbeddingModel()
    val embeddingModel = BgeSmallEnV15QuantizedEmbeddingModel()
    //val embeddingModel = OllamaEmbeddingModel.builder()
        //    .baseUrl("http://localhost:11434")
    // .modelName("embeddinggemma").build()
    // val useCaseStore: UseCaseEmbeddingsRepository = QdrantUseCaseEmbeddingsStore(embeddingModel, qdrantConfig)
    val embeddingStore: UseCaseEmbeddingsRepository = InMemoryUseCaseEmbeddingsStore(embeddingModel)
    val dataSource = EnvConfig.databaseUrl?.let { databaseUrl ->
        val hikariConfig = HikariConfig().apply {
            jdbcUrl = databaseUrl
            username = EnvConfig.databaseUser
            password = EnvConfig.databasePassword
            maximumPoolSize = 10
        }
        HikariDataSource(hikariConfig).also { Flyway.configure().dataSource(it).load().migrate() }
    }
    val adlStorage: AdlRepository = when {
        dataSource != null -> PostgresAdlRepository(dataSource)

        fileRepositoryFolders.adlFolder != null -> FileSystemAdlRepository(fileRepositoryFolders.adlFolder)
        else -> InMemoryAdlRepository()
    }
    val organizationRepository: OrganizationRepository = when {
        dataSource != null -> PostgresOrganizationRepository(dataSource)
        else -> InMemoryOrganizationRepository()
    }
    val ownerAccessResolver = OwnerAccessResolver(organizationRepository)
    val rolePromptRepository: RolePromptRepository = InMemoryRolePromptRepository()
    val agentRepository: AgentRepository = InMemoryAgentRepository()
    val mcpService = McpService()
    val testCaseRepository = when {
        fileRepositoryFolders.testCaseFolder != null -> FileSystemTestCaseRepository(fileRepositoryFolders.testCaseFolder)
        else -> InMemoryTestCaseRepository()
    }
    val testRunRepository: TestRunRepository = when {
        dataSource != null -> PostgresTestRunRepository(dataSource)
        fileRepositoryFolders.testRunFolder != null -> FileSystemTestRunRepository(fileRepositoryFolders.testRunFolder)
        else -> InMemoryTestRunRepository()
    }
    val userSettingsRepository = InMemoryUserSettingsRepository()
    val widgetRepository = when {
        fileRepositoryFolders.widgetFolder != null -> FileSystemWidgetRepository(fileRepositoryFolders.widgetFolder)
        else -> InMemoryWidgetRepository()
    }
    val clientEventPublisher = ClientEventPublisher()
    val completerProvider = UserDefinedCompleterProvider()
    val statisticsRepository = InMemoryStatisticsRepository()
    val tagRepository = InMemoryTagRepository()
    val organizationLifecycle = OrganizationLifecycle(
        organizationRepository = organizationRepository,
        adlRepository = adlStorage,
        widgetRepository = widgetRepository,
        testCaseRepository = testCaseRepository,
        testRunRepository = testRunRepository,
        agentRepository = agentRepository,
        rolePromptRepository = rolePromptRepository,
        userSettingsRepository = userSettingsRepository,
        statisticsRepository = statisticsRepository,
        tagRepository = tagRepository,
        embeddingsRepository = embeddingStore,
    )

    // Agents
    val exampleAgent = createExampleAgent(completerProvider)
    val evalAgent = createEvalAgent(completerProvider)
    val facesAgent = createWidgetCreatorAgent(completerProvider)
    val assistantAgent =
        createAssistantAgent(
            mcpService,
            testCaseRepository,
            embeddingStore,
            adlStorage,
            embeddingModel,
            widgetRepository,
            rolePromptRepository,
            clientEventPublisher,
            completerProvider
        )
    val conversationEvaluator = ConversationEvaluator(embeddingModel)
    val testCreatorAgent = createTestCreatorAgent(completerProvider)
    val improvementAgent = createImprovementAgent(completerProvider)
    val spellingAgent = createSpellingAgent(completerProvider)
    val testVariantAgent = createTestVariantCreatorAgent(completerProvider)

    val testExecutor =
        TestExecutor(assistantAgent, adlStorage, testCaseRepository, conversationEvaluator)

    // Initialize Qdrant collection
    runBlocking {
        embeddingStore.initialize()
    }

    // Load existing ADLs and store their examples in the embeddings store
    runBlocking {
        adlStorage.list().forEach { adl ->
            if (adl.examples.isNotEmpty()) embeddingStore.storeUtterances(adl.id, adl.examples, adl.tags.toSet())
            tagRepository.saveAll(adl.tags)
        }
    }

    return embeddedServer(CIO, port = port ?: EnvConfig.serverPort) {
        // Register shutdown hook to close resources
        monitor.subscribe(ApplicationStopping) {
            embeddingStore.close()
        }

        install(CORS) {
            allowMethod(HttpMethod.Options)
            allowMethod(HttpMethod.Put)
            allowMethod(HttpMethod.Delete)
            allowMethod(HttpMethod.Patch)
            allowHeader(HttpHeaders.Authorization)
            allowHeader(HttpHeaders.ContentType)
            allowHeader(ORGANIZATION_API_KEY_HEADER)
            allowHeader(LEGACY_ORGANIZATION_API_KEY_HEADER)
            allowHeader(ORGANIZATION_ID_HEADER)
            anyHost()
        }

        install(GraphQL) {
            schema {
                packages = listOf(
                    "org.eclipse.lmos.adl.server.inbound",
                    "org.eclipse.lmos.adl.server.agents",
                    "org.eclipse.lmos.arc.api",
                    "org.eclipse.lmos.adl.server.model",
                    "org.eclipse.lmos.adl.server.models",
                )
                queries = listOf(
                    AdlQuery(embeddingStore, adlStorage),
                    AgentQuery(agentRepository),
                    McpToolsQuery(mcpService),
                    TestCaseQuery(testCaseRepository),
                    TestRunQuery(testRunRepository),
                    UserSettingsQuery(userSettingsRepository),
                    WidgetQuery(widgetRepository),
                    OrganizationQuery(organizationRepository),
                    RolePromptQuery(rolePromptRepository),
                    DashboardQuery(adlStorage, statisticsRepository),
                    TagsQuery(tagRepository),
                )
                mutations = listOf(
                    AdlCompilerMutation(),
                    SystemPromptMutation(sessions, templateLoader, rolePromptRepository),
                    AdlStorageMutation(embeddingStore, adlStorage, tagRepository),
                    AgentMutation(agentRepository),
                    McpMutation(mcpService),
                    UserSettingsMutation(userSettingsRepository, completerProvider),
                    UseCaseImprovementMutation(improvementAgent),
                    SpellingMutation(spellingAgent),
                    AdlEvalMutation(evalAgent, conversationEvaluator),
                    AdlExampleMutation(exampleAgent),
                    TestCreatorMutation(
                        testCreatorAgent,
                        testCaseRepository,
                        testRunRepository,
                        testExecutor,
                        adlStorage,
                        testVariantAgent
                    ),
                    AdlValidationMutation(),
                    AdlAssistantMutation(assistantAgent, adlStorage, statisticsRepository, userSettingsRepository),
                    WidgetsMutation(facesAgent, widgetRepository),
                    OrganizationMutation(organizationRepository, organizationLifecycle),
                    RolePromptMutation(rolePromptRepository),
                )
            }
            server {
                contextFactory = DefaultKtorGraphQLContextFactory(ownerAccessResolver)
            }
            engine {
                exceptionHandler = GlobalExceptionHandler()
            }
        }

        install(StatusPages) {
            exception<OwnerAuthenticationException> { call, cause ->
                call.respond(HttpStatusCode.Unauthorized, cause.message ?: "Authentication required")
            }
            exception<OwnerAuthorizationException> { call, cause ->
                call.respond(HttpStatusCode.Forbidden, cause.message ?: "Access forbidden")
            }
            defaultGraphQLStatusPages()
        }

        install(SSE)

        routing {
            openAICompletions(assistantAgent, ownerAccessResolver)
            clientEvents(clientEventPublisher, ownerAccessResolver)
            graphiQLRoute()
            graphQLPostRoute()

            staticResources("/", "static") {
                fallback { requestedPath, call ->
                    // read from classpath
                    if (requestedPath.startsWith("prompts")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/prompts.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("settings")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/settings.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("roles")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/roles.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("dashboard")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/dashboard.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("widgets")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/widgets.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("faces")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/faces.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("assistant")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/assistant.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("analytics")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/analytics.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("organizations")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/organizations.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                    if (requestedPath.startsWith("adls")) call.respondText(
                        text = this::class.java.classLoader.getResource("static/adls.html")!!.readText(),
                        contentType = ContentType.Text.Html,
                    )
                }
            }
        }

        module()
    }.start(wait = wait)
}

fun main() {
    startServer()
}
