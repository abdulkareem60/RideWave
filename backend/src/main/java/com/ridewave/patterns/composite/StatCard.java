package com.ridewave.patterns.composite;

import lombok.Getter;

import java.util.List;
import java.util.Map;

/**
 * Composite Pattern — Leaf Node
 *
 * Represents a single statistic card on the admin dashboard.
 * Has no children — it IS the data (a key/value pair with an optional trend).
 *
 * Examples:
 *   new StatCard("Total Users",     4821,  "+12% this week")
 *   new StatCard("Open Reports",    12,    "↑ 3 new today")
 *   new StatCard("Revenue Today",   48200, "PKR")
 */
@Getter
public class StatCard implements DashboardComponent {

    private final String title;
    private final Object value;
    private final String trend;
    private final String unit;

    public StatCard(String title, Object value) {
        this(title, value, null, null);
    }

    public StatCard(String title, Object value, String trend) {
        this(title, value, trend, null);
    }

    public StatCard(String title, Object value, String trend, String unit) {
        this.title = title;
        this.value = value;
        this.trend = trend;
        this.unit  = unit;
    }

    @Override
    public Object getData() {
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("value", value != null ? value : 0);
        data.put("trend", trend != null ? trend : "");
        data.put("unit",  unit  != null ? unit  : "");
        return data;
    }

    @Override
    public List<DashboardComponent> getChildren() {
        return List.of();   // leaf — no children
    }

    @Override
    public boolean isLeaf() {
        return true;
    }
}