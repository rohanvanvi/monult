/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, CheckCircle2, AlertCircle, RefreshCcw, Activity, Zap, Loader2, StopCircle, ArrowRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { API_BASE, api } from "@/lib/api";

type Stage = {
    role: string;
    model?: string;
    output?: string;
    response?: { content: string };
    isThinking?: boolean;
};

interface HealthData {
    status: string;
    version: string;
    uptime: number;
    providers: string[];
    consensusConfig?: {
        strategy: string;
        minConfidence: number;
        weights: Record<string, number>;
        criteriaWeights?: Record<string, number>;
    };
}

export default function ConsensusPage() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [testPrompt, setTestPrompt] = useLocalStorage("monult_consensus_prompt", "");
    const [isTesting, setIsTesting] = useState(false);

    // Use timeline and consensus state identical to Assembly/Debate pages
    const [timeline, setTimeline] = useLocalStorage<Stage[] | null>("monult_consensus_timeline", null);
    const [consensus, setConsensus] = useLocalStorage<string | null>("monult_consensus_result", null);

    const [error, setError] = useState<string | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isTesting) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [timeline, isTesting]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsTesting(false);
            if (!consensus) {
                setConsensus("Consensus pipeline stopped.");
            }
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchHealth();
        setRefreshing(false);
    };

    const fetchHealth = useCallback(async () => {
        try {
            const res = await api.getHealth();
            setHealth(res);
        } catch {
            setHealth(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 15000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const validate = (): boolean => {
        if (!testPrompt.trim()) { setInputError("Prompt is required"); return false; }
        if (testPrompt.trim().length < 5) { setInputError("Prompt must be at least 5 characters"); return false; }
        setInputError(null);
        return true;
    };

    const runConsensusTest = async () => {
        if (!validate()) return;
        setIsTesting(true);
        setTimeline([]);
        setConsensus(null);
        setError(null);

        try {
            abortControllerRef.current = new AbortController();

            const response = await fetch(`${API_BASE}/assembly/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: testPrompt, debate: false, rounds: 1 }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                let errMessage = "Test failed";
                try {
                    const err = await response.json();
                    errMessage = err.error || errMessage;
                } catch {
                    errMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errMessage);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder("utf-8");

            if (!reader) throw new Error("No response stream");

            let currentTimeline: Stage[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6);
                        if (!dataStr || dataStr === "{}") continue;

                        try {
                            const event = JSON.parse(dataStr);

                            if (event.error) {
                                setError(event.error);
                                break;
                            }

                            if (event.type === "stage_start") {
                                const newStage: Stage = {
                                    role: event.role || event.stage,
                                    model: event.model,
                                    output: "",
                                    isThinking: true
                                };
                                currentTimeline = [...currentTimeline, newStage];
                                setTimeline([...currentTimeline]);
                            } else if (event.type === "stage_chunk") {
                                const activeStageIndex = currentTimeline.findLastIndex(s => s.isThinking);
                                if (activeStageIndex !== -1) {
                                    const stage = currentTimeline[activeStageIndex];
                                    stage.output = (stage.output || "") + event.chunk;
                                    setTimeline([...currentTimeline]);
                                }
                            } else if (event.type === "stage_complete") {
                                const activeStageIndex = currentTimeline.findLastIndex(s => s.isThinking);
                                if (activeStageIndex !== -1) {
                                    currentTimeline[activeStageIndex].isThinking = false;
                                    setTimeline([...currentTimeline]);
                                }
                            } else if (event.type === "consensus_complete") {
                                setConsensus(event.data?.finalContent || event.data?.reasoning || "Consensus Reached");
                            }
                        } catch (e) {
                            console.error("Error parsing SSE JSON", e);
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Stream stopped by user.');
            } else {
                setError(err.message || "Consensus stream failed.");
            }
        } finally {
            setIsTesting(false);
        }
    };

    // The scoring criteria from the real ConsensusEngine
    const defaultWeights = { length: 0.1, specificity: 0.25, structureQuality: 0.2, uniqueInsights: 0.2, consistency: 0.25 };
    const activeWeights = health?.consensusConfig?.criteriaWeights || defaultWeights;

    const SCORING_CRITERIA = [
        { name: "Specificity", weight: activeWeights.specificity, color: "var(--accent-blue)", desc: "Technical depth, code blocks, examples" },
        { name: "Consistency", weight: activeWeights.consistency, color: "var(--accent-purple)", desc: "Completion quality, token count, latency" },
        { name: "Structure Quality", weight: activeWeights.structureQuality, color: "var(--accent-green)", desc: "Headings, paragraphs, formatting" },
        { name: "Unique Insights", weight: activeWeights.uniqueInsights, color: "var(--accent-cyan)", desc: "Non-overlapping ideas across responses" },
        { name: "Length Quality", weight: activeWeights.length, color: "var(--accent-amber)", desc: "Optimal response length (200-5000 chars)" },
    ];

    const providerCount = health?.providers?.length || 0;
    const isOnline = health?.status === "ok";

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Consensus Engine</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Real-time cross-model validation and intelligent response selection
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    disabled={refreshing}
                    className="gap-2 border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                >
                    <RefreshCcw className={`w-3.5 h-3.5 transition-transform ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scoring Criteria (from real engine) */}
                <Card className="lg:col-span-2 glass-card border-[var(--border)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <Scale className="w-4 h-4 text-[var(--accent-blue)]" />
                            Scoring Criteria
                            <span className="text-[var(--text-faint)] font-normal ml-auto text-xs flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[var(--accent-purple)]"></span>
                                {(health?.consensusConfig?.strategy || "Hybrid").charAt(0).toUpperCase() + (health?.consensusConfig?.strategy || "Hybrid").slice(1)} Strategy
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-[var(--border)]">
                        {SCORING_CRITERIA.map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-4 px-6 hover:bg-[var(--bg-hover)] transition-colors animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">{c.name}</span>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{c.desc}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Weight bar */}
                                    <div className="w-20 h-1.5 rounded-full bg-[var(--bg-active)] overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${c.weight * 100}%`, background: c.color }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono font-bold w-12 text-right" style={{ color: c.color }}>
                                        {(c.weight * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Status Card */}
                <div className="space-y-4">
                    <Card className="glass-card border-[var(--border)]">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            {loading ? (
                                <div className="space-y-3 w-full">
                                    <Skeleton className="h-14 w-14 rounded-2xl mx-auto bg-[var(--bg-elevated)]" />
                                    <Skeleton className="h-5 w-28 mx-auto bg-[var(--bg-elevated)]" />
                                    <Skeleton className="h-4 w-40 mx-auto bg-[var(--bg-elevated)]" />
                                </div>
                            ) : (
                                <>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isOnline ? "bg-[var(--accent-green)]/10" : "bg-[var(--accent-red)]/10"}`}>
                                        {isOnline ? <CheckCircle2 className="w-7 h-7 text-[var(--accent-green)]" /> : <AlertCircle className="w-7 h-7 text-[var(--accent-red)]" />}
                                    </div>
                                    <h4 className="text-base font-bold text-white mb-1">
                                        {isOnline ? "Engine Active" : "Engine Offline"}
                                    </h4>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[220px]">
                                        {isOnline
                                            ? `Cross-model validation running across ${providerCount} provider${providerCount !== 1 ? "s" : ""}.`
                                            : "Cannot connect to Monult API server."}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-[var(--border)]">
                        <CardContent className="p-0 divide-y divide-[var(--border)]">
                            {loading ? (
                                <div className="p-4 space-y-3">
                                    <Skeleton className="h-4 w-full bg-[var(--bg-elevated)]" />
                                    <Skeleton className="h-4 w-3/4 bg-[var(--bg-elevated)]" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between p-4 px-5">
                                        <span className="text-xs text-[var(--text-muted)]">Strategy</span>
                                        <Badge variant="outline" className="text-[10px] border-[var(--accent-purple)]/30 text-[var(--accent-purple)]">
                                            {(health?.consensusConfig?.strategy || "hybrid").toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-4 px-5">
                                        <span className="text-xs text-[var(--text-muted)]">Providers</span>
                                        <span className="text-sm font-mono font-bold text-white">{providerCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 px-5">
                                        <span className="text-xs text-[var(--text-muted)]">Min Confidence</span>
                                        <span className="text-sm font-mono text-[var(--accent-amber)]">
                                            {Math.round((health?.consensusConfig?.minConfidence || 0.5) * 100)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 px-5">
                                        <span className="text-xs text-[var(--text-muted)]">Mode</span>
                                        <Badge variant="outline" className="text-[10px] border-[var(--accent-green)]/30 text-[var(--accent-green)]">Automatic</Badge>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Test Consensus */}
            <Card className="glass-card border-[var(--border)]">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                        <Zap className="w-4 h-4 text-[var(--accent-amber)]" />
                        Test Consensus
                        <span className="text-[var(--text-faint)] font-normal ml-auto text-xs">Run a live assembly to see scoring in action</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-2xl space-y-3">
                        <Textarea
                            value={testPrompt}
                            onChange={(e) => { setTestPrompt(e.target.value); if (inputError) setInputError(null); }}
                            placeholder="Enter a prompt to trigger multi-model consensus (e.g., Compare REST vs GraphQL APIs)..."
                            className="bg-[var(--bg-elevated)] border-[var(--border)] min-h-[80px] resize-none text-sm focus-visible:ring-[var(--accent-blue)]/50"
                        />
                        {inputError && (
                            <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs">
                                <AlertCircle className="w-3 h-3" /> {inputError}
                            </div>
                        )}
                        <Button
                            onClick={runConsensusTest}
                            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white w-full shadow-lg shadow-[var(--glow-blue)]"
                            disabled={!testPrompt.trim() || isTesting}
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            {isTesting ? "Running Consensus..." : "Run Consensus Test"}
                        </Button>
                    </div>

                    {/* Loading skeleton wrapper when starting */}
                    {isTesting && timeline && timeline.length === 0 && (
                        <div className="space-y-3 max-w-2xl animate-pulse-soft">
                            <Skeleton className="h-5 w-40 bg-[var(--bg-elevated)]" />
                            <Skeleton className="h-24 w-full rounded-xl bg-[var(--bg-elevated)]" />
                            <Skeleton className="h-12 w-full rounded-xl bg-[var(--bg-elevated)]" />
                        </div>
                    )}

                    {error && (
                        <div className="bg-[var(--accent-red)]/5 text-[var(--accent-red)] p-4 rounded-xl border border-[var(--accent-red)]/20 text-sm">
                            {error}
                            <Button variant="link" className="text-[var(--accent-red)] p-0 h-auto mt-2 text-xs block" onClick={() => { setError(null); setTestPrompt(""); setTimeline(null); }}>
                                Reset
                            </Button>
                        </div>
                    )}

                    {/* Timeline */}
                    {timeline && (
                        <div className="relative pl-8 space-y-5 before:absolute before:left-[15px] before:top-0 before:bottom-0 before:w-px before:bg-[var(--border)] mt-6">
                            {timeline.map((s, i) => {
                                const isCritic = s.role === "critic";
                                const isImprover = s.role === "improver";
                                const color = isCritic ? "var(--accent-amber)" : isImprover ? "var(--accent-green)" : "var(--accent-blue)";
                                return (
                                    <div key={i} className="relative animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="absolute -left-8 top-1 w-7 h-7 rounded-full border-2 bg-[var(--bg-card)] z-10" style={{ borderColor: color }} />
                                        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-[10px]" style={{ color, borderColor: `${color}40` }}>
                                                    {s.role.toUpperCase()}
                                                </Badge>
                                                <span className="text-[10px] text-[var(--text-faint)] font-mono flex items-center gap-2">
                                                    {(s.model || "auto").toUpperCase()}
                                                    {s.isThinking && (
                                                        <span className="text-[10px] text-[var(--text-muted)] flex items-center animate-pulse">
                                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> streaming typing...
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <MarkdownRenderer content={s.output || s.response?.content || (s.isThinking ? "Thinking..." : "")} />
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>
                    )}

                    {/* Loading indicator while testing with partial results */}
                    {isTesting && timeline && timeline.length > 0 && (
                        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-6">
                            <div className="relative pl-8 flex items-center h-8">
                                <div className="absolute -left-8 top-1 flex items-center justify-center">
                                    <RefreshCcw className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                                </div>
                                <p className="text-sm text-[var(--text-muted)] animate-pulse-soft">Validating multi-model criteria...</p>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStop}
                                className="border-[var(--accent-red)]/20 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 text-xs"
                            >
                                <StopCircle className="w-3.5 h-3.5 mr-2" /> Stop Generation
                            </Button>
                        </div>
                    )}

                    {/* Consensus Result Output */}
                    {consensus && (
                        <div className="max-w-2xl animate-slide-up space-y-4 pt-4 mt-4 border-t border-[var(--border)]">
                            <div className="bg-[var(--accent-green)]/5 border border-[var(--accent-green)]/20 rounded-xl p-5">
                                <div className="flex items-center gap-2 font-semibold text-[var(--accent-green)] text-xs uppercase tracking-wider mb-3">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Consensus Result
                                </div>
                                <div className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                                    <MarkdownRenderer content={consensus} />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-4 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10"
                                    onClick={() => { setTimeline(null); setConsensus(null); setTestPrompt(""); }}
                                >
                                    New Consensus Pass <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
