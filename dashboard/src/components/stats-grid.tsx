/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    changeLabel: string;
    changeType?: "up" | "down" | "neutral";
    indicator?: string;
}

export function StatCard({ label, value, changeLabel, changeType = "neutral", indicator }: StatCardProps) {
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-5 transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--text-muted)]">
            <div className="text-[12px] text-[var(--text-muted)] uppercase tracking-[1px] font-semibold mb-2">
                {label}
            </div>
            <div className="text-[28px] font-bold tracking-[-1px] mb-1.5 leading-none text-white">
                {value}
            </div>
            <div className={cn(
                "text-[12px] flex items-center gap-1",
                changeType === "up" && "text-[var(--accent-green)]",
                changeType === "down" && "text-[var(--accent-red)]",
                changeType === "neutral" && "text-[var(--text-secondary)]"
            )}>
                {indicator && <span>{indicator}</span>}
                <span>{changeLabel}</span>
            </div>
        </div>
    );
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {children}
        </div>
    );
}
