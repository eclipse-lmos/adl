// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0
package org.eclipse.lmos.adl.server.agents.extensions

import org.eclipse.lmos.arc.assistants.support.usecases.Conditional
import org.eclipse.lmos.arc.assistants.support.usecases.UseCase

/**
 * Converts steps in use cases to conditionals in the solution,
 * and appends "else" conditions to original solution steps.
 * Example,
 * ### UseCase: my_use_case
 * #### Description
 * Description
 * #### Steps
 *  - Step 1
 *  - Step 2
 * #### Solution
 * Solution 1
 *
 * After conversion:
 *
 * ### UseCase: my_use_case
 * #### Description
 * Description
 * #### Solution
 * <step_1> Step 1
 * <step_2> Step 2
 * <else> Solution 1
 */
class StepConverter {

    fun convert(useCases: List<UseCase>): List<UseCase> {
        return useCases.map { uc ->
            if (uc.steps.isNotEmpty()) {
                val convertedSteps = uc.steps.filter { it.text.isNotEmpty() }.mapIndexed { i, step ->
                    step.copy(conditions = step.conditions + "step_${i + 1}")
                }
                uc.copy(solution = convertedSteps + uc.solution.map { s ->
                    s.copy(conditions = s.conditions + "else")
                } + Conditional("\n"), steps = emptyList())
            } else uc
        }
    }
}

