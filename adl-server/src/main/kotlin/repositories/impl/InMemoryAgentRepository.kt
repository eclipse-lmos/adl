// SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.models.Agent
import org.eclipse.lmos.adl.server.repositories.AgentRepository
import java.util.concurrent.ConcurrentHashMap

class InMemoryAgentRepository : AgentRepository {
    private val agents = ConcurrentHashMap<String, Agent>()

    override fun save(agent: Agent): Agent {
        agents[agent.id] = agent
        return agent
    }

    override fun findById(id: String): Agent? {
        return agents[id]
    }

    override fun findAll(): List<Agent> {
        return agents.values.toList()
    }

    override fun delete(id: String): Boolean {
        return agents.remove(id) != null
    }
}

