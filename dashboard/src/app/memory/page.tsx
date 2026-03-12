/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Database, Layers, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function MemoryPage() {
    const [query, setQuery] = useLocalStorage("monult_memory_query", "");
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useLocalStorage<any[] | null>("monult_memory_results", null);
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [inputError, setInputError] = useState<string | null>(null);

    useEffect(() => {
        api.getMemoryStats()
            .then(setStats)
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));
    }, []);

    const validate = (): boolean => {
        if (!query.trim()) { setInputError("Search query is required"); return false; }
        if (query.trim().length < 2) { setInputError("Query must be at least 2 characters"); return false; }
        setInputError(null);
        return true;
    };

    const handleSearch = async () => {
        if (!validate()) return;
        setIsSearching(true);
        setResults(null);

        try {
            const res = await api.recallMemory(query, "default", 5);
            setResults(res.results || []);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Memory Store</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1 flex justify-between items-center w-full">
                    <span>Semantic vector search and long-term knowledge retrieval</span>
                    {results && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setResults(null); setQuery(""); }}
                            className="text-[var(--text-faint)] hover:text-white h-7 text-xs"
                        >
                            Clear Results
                        </Button>
                    )}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 glass-card border-[var(--border)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <Search className="w-4 h-4 text-[var(--accent-blue)]" />
                            Query Memory
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <Input
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); if (inputError) setInputError(null); }}
                                    placeholder="Search memories..."
                                    className="bg-[var(--bg-elevated)] border-[var(--border)] h-11 text-sm focus-visible:ring-[var(--accent-blue)]/50"
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                                <Button onClick={handleSearch} className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white h-11 px-6 shadow-lg shadow-[var(--glow-blue)]" disabled={!query.trim() || isSearching}>
                                    Search
                                </Button>
                            </div>
                            {inputError && (
                                <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs">
                                    <AlertCircle className="w-3 h-3" /> {inputError}
                                </div>
                            )}
                        </div>

                        {isSearching ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-20 rounded-xl bg-[var(--bg-elevated)]" />
                                ))}
                            </div>
                        ) : results === null ? (
                            <div className="bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
                                Results will appear here after searching.
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-sm text-[var(--text-muted)] text-center py-6">No memories matched your query.</div>
                        ) : (
                            <div className="space-y-3 stagger-children">
                                {results.map((r, i) => (
                                    <div key={i} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--text-faint)] transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-white">Match {i + 1}</span>
                                            <Badge variant="outline" className="text-[10px] border-[var(--accent-purple)]/30 text-[var(--accent-purple)] font-mono">
                                                {r.score ? r.score.toFixed(4) : "N/A"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                            {r.content || r.value || "Empty"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card border-[var(--border)] h-fit">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <Database className="w-4 h-4 text-[var(--accent-green)]" />
                            Memory Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-[var(--border)]">
                        {statsLoading ? (
                            <div className="p-4 space-y-3">
                                <Skeleton className="h-4 w-full bg-[var(--bg-elevated)]" />
                                <Skeleton className="h-4 w-3/4 bg-[var(--bg-elevated)]" />
                            </div>
                        ) : !stats ? (
                            <div className="p-4 text-xs text-[var(--text-muted)]">Stats unavailable.</div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between p-4 px-5">
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                        <Database className="w-3.5 h-3.5" /> Total Entries
                                    </div>
                                    <span className="text-sm font-bold font-mono text-white">{(stats.totalValues || stats.vectorCount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 px-5">
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                        <Layers className="w-3.5 h-3.5" /> Layers
                                    </div>
                                    <span className="text-sm font-bold font-mono text-white">{stats.layers?.length || stats.layerCount || 0}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
