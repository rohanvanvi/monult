/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    MessageCircle,
    Blocks,
    Cpu,
    Compass,
    MessagesSquare,
    Scale,
    Bot,
    BrainCircuit,
    DollarSign,
    Settings,
    Users,
    Terminal,
    ChevronLeft,
    ChevronRight,
    Hexagon,
} from "lucide-react";
import { useState } from "react";

const NAV_SECTIONS = [
    {
        label: "Overview",
        items: [
            { href: "/", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/chat", icon: MessageCircle, label: "Chat" },
        ],
    },
    {
        label: "AI Engine",
        items: [
            { href: "/devteam", icon: Users, label: "DevTeam" },
            { href: "/ide", icon: Terminal, label: "IDE" },
            { href: "/assembly", icon: Blocks, label: "Assembly" },
            { href: "/models", icon: Cpu, label: "Models" },
            { href: "/router", icon: Compass, label: "Router" },
            { href: "/debates", icon: MessagesSquare, label: "Debates" },
            { href: "/consensus", icon: Scale, label: "Consensus" }
        ],
    },
    {
        label: "Workspace",
        items: [
            { href: "/workspace", icon: Terminal, label: "Workspace" }
        ],
    },
    {
        label: "Agents",
        items: [
            { href: "/agents", icon: Bot, label: "Agents" },
            { href: "/memory", icon: BrainCircuit, label: "Memory" }
        ],
    },
    {
        label: "Settings",
        items: [
            { href: "/settings", icon: Settings, label: "Settings" },
            { href: "/cost", icon: DollarSign, label: "Cost" }
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`flex flex-col h-screen bg-[var(--bg-primary)] border-r border-[var(--border)] transition-all duration-300 ease-in-out ${collapsed ? "w-[68px]" : "w-[240px]"
                }`}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--border)] shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-blue)] flex items-center justify-center shrink-0">
                    <Hexagon className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in">
                        <span className="font-bold text-white text-sm tracking-tight">Monult</span>
                        <span className="text-[var(--text-muted)] text-[10px] ml-1 font-mono">OS</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.label}>
                        {!collapsed && (
                            <p className="text-[10px] uppercase font-semibold text-[var(--text-faint)] tracking-[0.12em] px-2 mb-2">
                                {section.label}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const isActive =
                                    item.href === "/"
                                        ? pathname === "/"
                                        : pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative ${isActive
                                            ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                                            : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]"
                                            }`}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent-blue)]" />
                                        )}
                                        <item.icon
                                            className={`w-[18px] h-[18px] shrink-0 ${isActive
                                                ? "text-[var(--accent-blue)]"
                                                : "text-[var(--text-muted)] group-hover:text-white"
                                                }`}
                                        />
                                        {!collapsed && <span>{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center h-12 border-t border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors shrink-0"
            >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
        </aside>
    );
}
