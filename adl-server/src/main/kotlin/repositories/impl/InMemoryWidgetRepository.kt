// SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
//
// SPDX-License-Identifier: Apache-2.0

package org.eclipse.lmos.adl.server.repositories.impl

import org.eclipse.lmos.adl.server.currentOwner
import org.eclipse.lmos.adl.server.models.Widget
import org.eclipse.lmos.adl.server.repositories.WidgetRepository
import java.util.concurrent.ConcurrentHashMap

class InMemoryWidgetRepository : WidgetRepository {
    private val widgets = ConcurrentHashMap<String, Widget>()

    override fun save(widget: Widget): Widget {
        val scopedWidget = widget.copy(owner = currentOwner())
        widgets[key(scopedWidget.owner, scopedWidget.id)] = scopedWidget
        return scopedWidget
    }

    override fun findById(id: String): Widget? {
        return widgets[key(currentOwner(), id)]
    }

    override fun findByName(name: String): List<Widget> {
        val owner = currentOwner()
        return widgets.values.filter { it.owner == owner && it.name == name }
    }

    override fun findAll(): List<Widget> {
        val owner = currentOwner()
        return widgets.values.filter { it.owner == owner }
    }

    override fun delete(id: String): Boolean {
        return widgets.remove(key(currentOwner(), id)) != null
    }

    private fun key(owner: String, id: String): String = "$owner::$id"
}
