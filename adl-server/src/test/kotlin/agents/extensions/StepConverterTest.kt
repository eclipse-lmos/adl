// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.agents.extensions

import org.eclipse.lmos.arc.assistants.support.usecases.Conditional
import org.eclipse.lmos.arc.assistants.support.usecases.UseCase
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class StepConverterTest {

    @Test
    fun `should convert steps to conditionals`() {
        val useCase = UseCase(
            id = "uc1",
            steps = listOf(
                Conditional("Step 1", setOf("cond1")),
                Conditional("Step 2")
            ),
            solution = listOf(
                Conditional("Solution 1", setOf("solCond1"))
            )
        )

        val converter = StepConverter()
        val result = converter.convert(listOf(useCase))

        assertEquals(1, result.size)
        val convertedUseCase = result[0]

        // verify steps are empty
        assertTrue(convertedUseCase.steps.isEmpty())

        // verify solution
        val solution = convertedUseCase.solution
        assertEquals(4, solution.size) // 2 converted steps + 1 original solution + 1 Conditional("\n")

        // check converted step 1
        assertEquals("Step 1", solution[0].text)
        assertTrue(solution[0].conditions.contains("step_1"))
        assertTrue(solution[0].conditions.contains("cond1"))

        // check converted step 2
        assertEquals("Step 2", solution[1].text)
        assertTrue(solution[1].conditions.contains("step_2"))

        // check original solution step
        assertEquals("Solution 1", solution[2].text)
        assertTrue(solution[2].conditions.contains("solCond1"))
        assertTrue(solution[2].conditions.contains("else"))

        // check newline conditional
        assertEquals("\n", solution[3].text)
    }

    @Test
    fun `should not modify use cases without steps`() {
        val useCase = UseCase(
            id = "uc2",
            solution = listOf(
                Conditional("Solution 1")
            )
        )

        val converter = StepConverter()
        val result = converter.convert(listOf(useCase))

        assertEquals(1, result.size)
        assertEquals(useCase, result[0])
    }
}

