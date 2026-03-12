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
import { DollarSign, TrendingUp, PieChart } from "lucide-react";

export default function CostPage() {
    const { data, loading } = useDashboardData();

    const cost = data.cost || {};
    const byProvider = cost.byProvider || {};
    const byModel = cost.byModel || {};
    const totalCost = cost.totalCost || 0;
    const totalRequests = cost.totalRequests || 0;
    const totalTokens = cost.totalTokens || 0;

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Cost Analytics</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">API usage expenditure and breakdowns</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
                {loading ? (
                    <>
                        <Skeleton className="h-24 rounded-xl bg-[var(--bg-elevated)]" />
                        <Skeleton className="h-24 rounded-xl bg-[var(--bg-elevated)]" />
                        <Skeleton className="h-24 rounded-xl bg-[var(--bg-elevated)]" />
                    </>
                ) : (
                    <>
                        <Card className="glass-card border-[var(--border)]">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-[var(--text-muted)] uppercase">Total Cost</span>
                                    <DollarSign className="w-4 h-4 text-[var(--accent-green)]" />
                                </div>
                                <div className="text-2xl font-bold text-white font-mono">${totalCost.toFixed(4)}</div>
                            </CardContent>
                        </Card>
                        <Card className="glass-card border-[var(--border)]">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-[var(--text-muted)] uppercase">Requests</span>
                                    <TrendingUp className="w-4 h-4 text-[var(--accent-blue)]" />
                                </div>
                                <div className="text-2xl font-bold text-white font-mono">{totalRequests.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                        <Card className="glass-card border-[var(--border)]">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-[var(--text-muted)] uppercase">Tokens</span>
                                    <PieChart className="w-4 h-4 text-[var(--accent-purple)]" />
                                </div>
                                <div className="text-2xl font-bold text-white font-mono">{totalTokens.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Breakdown tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card border-[var(--border)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <DollarSign className="w-4 h-4 text-[var(--accent-green)]" />
                            By Provider
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-[var(--border)]">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                <Skeleton className="h-5 w-full bg-[var(--bg-elevated)]" />
                                <Skeleton className="h-5 w-3/4 bg-[var(--bg-elevated)]" />
                            </div>
                        ) : Object.keys(byProvider).length === 0 ? (
                            <div className="p-6 text-sm text-[var(--text-muted)] text-center">No data yet.</div>
                        ) : (
                            <>
                                {Object.entries(byProvider).map(([p, d]: any, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 px-5 hover:bg-[var(--bg-hover)] transition-colors">
                                        <div>
                                            <span className="text-sm font-medium text-white">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                            <span className="text-[10px] text-[var(--text-faint)] ml-2">{d.requests || 0} req</span>
                                        </div>
                                        <span className="text-sm font-bold font-mono text-[var(--accent-green)]">${(d.cost || 0).toFixed(4)}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between p-4 px-5 bg-[var(--bg-hover)]">
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">Total</span>
                                    <span className="text-base font-bold font-mono text-white">${totalCost.toFixed(4)}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card border-[var(--border)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <PieChart className="w-4 h-4 text-[var(--accent-purple)]" />
                            By Model
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-[var(--border)]">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                <Skeleton className="h-5 w-full bg-[var(--bg-elevated)]" />
                                <Skeleton className="h-5 w-3/4 bg-[var(--bg-elevated)]" />
                            </div>
                        ) : Object.keys(byModel).length === 0 ? (
                            <div className="p-6 text-sm text-[var(--text-muted)] text-center">No data yet.</div>
                        ) : (
                            Object.entries(byModel).map(([m, d]: any, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 px-5 hover:bg-[var(--bg-hover)] transition-colors">
                                    <div>
                                        <span className="text-sm font-medium text-[var(--text-secondary)]">{m}</span>
                                        <span className="text-[10px] text-[var(--text-faint)] ml-2">{d.requests || 0} req</span>
                                    </div>
                                    <span className="text-sm font-bold font-mono text-[var(--accent-purple)]">${(d.cost || 0).toFixed(4)}</span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
