/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, Zap, Shield } from "lucide-react";

function ModelSkeleton() {
    return (
        <div className="flex items-center justify-between p-4 px-5">
            <div className="flex items-center gap-3">
                <Skeleton className="w-3 h-3 rounded-full bg-[var(--bg-elevated)]" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28 bg-[var(--bg-elevated)]" />
                    <Skeleton className="h-3 w-16 bg-[var(--bg-elevated)]" />
                </div>
            </div>
            <Skeleton className="h-5 w-14 rounded-full bg-[var(--bg-elevated)]" />
        </div>
    );
}

export default function ModelsPage() {
    const { data, loading } = useDashboardData();

    const providers = data.providers;
    const models = data.models;
    const costByModel = data.cost?.byModel || {};

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Models & Providers</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    Connected AI providers and available model configurations
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Providers */}
                <Card className="glass-card border-[var(--border)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <Shield className="w-4 h-4 text-[var(--accent-blue)]" />
                            Active Providers
                            {!loading && (
                                <Badge className="ml-auto bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20 text-[10px]">
                                    {providers.length} Connected
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-[var(--border)]">
                        {loading ? (
                            <>
                                <ModelSkeleton />
                                <ModelSkeleton />
                                <ModelSkeleton />
                            </>
                        ) : providers.length === 0 ? (
                            <div className="p-6 text-center text-sm text-[var(--text-muted)]">No providers configured.</div>
                        ) : (
                            providers.map((p: string, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 px-5 hover:bg-[var(--bg-hover)] transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-green)]" />
                                            <div className="absolute inset-0 rounded-full bg-[var(--accent-green)] animate-ping opacity-40" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{p.charAt(0).toUpperCase() + p.slice(1)}</div>
                                            <div className="text-[11px] text-[var(--text-faint)]">API Provider</div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] border-[var(--accent-green)]/30 text-[var(--accent-green)]">
                                        Active
                                    </Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Performance */}
                <Card className="glass-card border-[var(--border)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <Zap className="w-4 h-4 text-[var(--accent-amber)]" />
                            Model Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-[var(--border)]">
                        {loading ? (
                            <>
                                <ModelSkeleton />
                                <ModelSkeleton />
                            </>
                        ) : Object.keys(costByModel).length === 0 ? (
                            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
                                No performance data yet. Generate some requests first.
                            </div>
                        ) : (
                            Object.entries(costByModel).map(([model, metrics]: any, idx: number) => {
                                const colors = ["text-[var(--accent-blue)]", "text-[var(--accent-purple)]", "text-[var(--accent-green)]", "text-[var(--accent-cyan)]"];
                                return (
                                    <div key={idx} className="flex items-center justify-between p-4 px-5 hover:bg-[var(--bg-hover)] transition-colors">
                                        <div>
                                            <div className="text-sm font-medium text-[var(--text-secondary)]">{model}</div>
                                            <div className="text-[11px] text-[var(--text-faint)]">{metrics.requests || 0} requests</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-bold font-mono ${colors[idx % colors.length]}`}>
                                                {Math.round(metrics.avgLatency || 0)}ms
                                            </div>
                                            <div className="text-[10px] text-[var(--text-faint)]">avg latency</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Available Models */}
                <Card className="glass-card border-[var(--border)] lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <Cpu className="w-4 h-4 text-[var(--accent-purple)]" />
                            Available Models
                            {!loading && (
                                <span className="text-[var(--text-faint)] font-normal ml-auto text-xs">{models.length} total</span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 rounded-lg bg-[var(--bg-elevated)]" />
                                ))}
                            </div>
                        ) : models.length === 0 ? (
                            <div className="text-center text-sm text-[var(--text-muted)] py-4">No models available.</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {models.map((m: any, idx: number) => {
                                    const name = typeof m === "string" ? m : m.id || m.name || "Unknown";
                                    const provider = typeof m === "string" ? "" : m.provider || "";
                                    return (
                                        <div key={idx} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--text-faint)] transition-colors">
                                            <div className="text-xs font-medium text-white truncate">{name}</div>
                                            {provider && <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{provider}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
