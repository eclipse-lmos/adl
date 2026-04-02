// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile

dependencies {
    val arcVersion = "0.217.0-M2"
    val graphqlKotlinVersion = "9.0.0"

    implementation("org.eclipse.lmos:arc-assistants:${arcVersion}")

    // MCP
    implementation(libs.mcp.kotlin.sdk)

    // Ktor
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.cio.jvm)
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.cors)

    // GraphQL
    implementation("com.expediagroup:graphql-kotlin-schema-generator:${graphqlKotlinVersion}")
    implementation("com.expediagroup:graphql-kotlin-server:${graphqlKotlinVersion}")

    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

tasks.withType<KotlinJvmCompile>().configureEach {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
    }
}

tasks.test {
    useJUnitPlatform()
}