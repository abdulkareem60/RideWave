package com.ridewave.patterns.composite;

import lombok.Getter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Composite Pattern — Branch Node (Composite)
 *
 * Contains other DashboardComponents — either StatCard leaves or nested panels.
 * getData() recursively collects data from all children, returning a map
 * keyed by each child's title.
 *
 * The key insight: AdminService calls root.getData() once and gets the entire
 * dashboard data tree without knowing which nodes are leaves vs composites.
 */
@Getter
public class DashboardPanel implements DashboardComponent {

    private final String                   title;
    private final List<DashboardComponent> children = new ArrayList<>();

    public DashboardPanel(String title) {
        this.title = title;
    }

    // ── Composite management ──────────────────────────────────────────────

    public DashboardPanel add(DashboardComponent component) {
        children.add(component);
        return this;   // fluent for chaining
    }

    public void remove(DashboardComponent component) {
        children.remove(component);
    }

    // ── Uniform interface ─────────────────────────────────────────────────

    /**
     * Recursively collects data from all children into a map.
     * Leaf StatCards contribute their value directly.
     * Nested DashboardPanels contribute their own recursive getData() result.
     */
    @Override
    public Object getData() {
        Map<String, Object> result = new LinkedHashMap<>();
        for (DashboardComponent child : children) {
            result.put(child.getTitle(), child.getData());
        }
        return result;
    }

    @Override
    public boolean isLeaf() {
        return false;
    }
}