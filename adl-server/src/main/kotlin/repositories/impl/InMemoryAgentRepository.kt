// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.repositories.AgentRepository
import java.util.concurrent.ConcurrentHashMap

class InMemoryAgentRepository : AgentRepository {
    private val agents = ConcurrentHashMap<String, Agent>()

    override fun save(agent: Agent): Agent {
        val scopedAgent = agent.copy(owner = currentOwner())
        agents[key(scopedAgent.owner, scopedAgent.id)] = scopedAgent
        return scopedAgent
    }

    override fun findById(id: String): Agent? {
        return agents[key(currentOwner(), id)]
    }

    override fun findAll(): List<Agent> {
        val owner = currentOwner()
        return agents.values.filter { it.owner == owner }
    }

    override fun delete(id: String): Boolean {
        return agents.remove(key(currentOwner(), id)) != null
    }

    private fun key(owner: String, id: String): String = "$owner::$id"
}

