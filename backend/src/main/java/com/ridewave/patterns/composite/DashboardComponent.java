package com.ridewave.patterns.composite;

import java.util.List;

/**
 * Composite Pattern — Component Interface
 *
 * Problem this solves:
 *   The admin dashboard has a deeply nested structure:
 *     Dashboard
 *       └── PlatformPanel
 *             ├── StatCard("Total Users", 4821)
 *             ├── StatCard("Total Rides",  930)
 *             └── StatCard("Revenue Today", 48200)
 *       └── SafetyPanel
 *             ├── StatCard("Open Reports",  12)
 *             └── StatCard("Pending Verif", 5)
 *
 *   Without Composite, AdminService would need separate logic to collect
 *   leaf stats and assemble panels, with conditionals at every level.
 *
 * How it works:
 *   Both DashboardPanel (branch — contains children) and StatCard (leaf — no children)
 *   implement this interface. The dashboard renderer calls getData() on the root
 *   and recursively collects everything without knowing whether it's a leaf or branch.
 *
 * The isLeaf() check exists only for serialisation purposes — the tree can be
 * traversed uniformly via getData() in all cases.
 */
public interface DashboardComponent {

    String                    getTitle();
    Object                    getData();
    List<DashboardComponent>  getChildren();
    boolean                   isLeaf();
}