/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState, useRef, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessagesSquare, CheckCircle2, AlertCircle, ArrowRight, Loader2, StopCircle } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { API_BASE } from "@/lib/api";

type DebateStage = {
    model?: string;
    role: string;
    response?: { content: string };
    output?: string;
    isThinking?: boolean;
};

export default function DebatesPage() {
    const [topic, setTopic] = useLocalStorage("monult_debate_topic", "");
    const [rounds, setRounds] = useLocalStorage("monult_debate_rounds", "2");
    const [isDebating, setIsDebating] = useLocalStorage("monult_debate_is_debating", false);
    const [stages, setStages] = useLocalStorage<DebateStage[] | null>("monult_debate_stages", null);
    const [consensus, setConsensus] = useLocalStorage<string | null>("monult_debate_consensus", null);
    const [error, setError] = useState<string | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isDebating) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [stages, isDebating]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsDebating(false);
            if (!consensus) {
                setConsensus("Debate deliberately halted.");
            }
        }
    };

    const validate = (): boolean => {
        if (!topic.trim()) { setInputError("Topic is required"); return false; }
        if (topic.trim().length < 5) { setInputError("Topic must be at least 5 characters"); return false; }
        const r = parseInt(rounds);
        if (isNaN(r) || r < 1 || r > 10) { setInputError("Rounds must be between 1 and 10"); return false; }
        setInputError(null);
        return true;
    };

    const startDebate = async () => {
        if (!validate()) return;
        setIsDebating(true);
        setStages([]);
        setConsensus(null);
        setError(null);

        try {
            abortControllerRef.current = new AbortController();

            const response = await fetch(`${API_BASE}/debate/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, rounds: parseInt(rounds) }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                let errMessage = "Debate failed";
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

            let currentStages: DebateStage[] = [];

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
                                const newStage: DebateStage = {
                                    role: event.role || event.stage,
                                    model: event.model,
                                    output: "",
                                    isThinking: true
                                };
                                currentStages = [...currentStages, newStage];
                                setStages([...currentStages]);
                            } else if (event.type === "stage_chunk") {
                                const activeStageIndex = currentStages.findLastIndex(s => s.isThinking);
                                if (activeStageIndex !== -1) {
                                    const stage = currentStages[activeStageIndex];
                                    stage.output = (stage.output || "") + event.chunk;
                                    setStages([...currentStages]);
                                }
                            } else if (event.type === "stage_complete") {
                                const activeStageIndex = currentStages.findLastIndex(s => s.isThinking);
                                if (activeStageIndex !== -1) {
                                    currentStages[activeStageIndex].isThinking = false;
                                    // if there's complete data returned, use it
                                    if (event.data?.content || event.data?.response?.content) {
                                        currentStages[activeStageIndex].output = event.data?.content || event.data?.response?.content || currentStages[activeStageIndex].output;
                                    }
                                    setStages([...currentStages]);
                                }
                            } else if (event.type === "debate_complete" || event.type === "consensus_complete") {
                                setConsensus(event.data?.finalConsensus || event.data?.reasoning || "Consensus Reached");
                            }
                        } catch (e) {
                            console.error("Error parsing SSE JSON", e);
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Debate stopped by user.');
            } else {
                setError(err.message || "Debate stream failed.");
            }
        } finally {
            setIsDebating(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Debate Engine</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Multi-model adversarial debates on any topic</p>
                </div>
                <div className="flex items-center gap-3">
                    {stages && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setStages(null); setConsensus(null); setTopic(""); setError(null); setIsDebating(false); }}
                            className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                        >
                            Clear Results
                        </Button>
                    )}
                </div>
            </div>

            <Card className="glass-card border-[var(--border)]">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                        <MessagesSquare className="w-4 h-4 text-[var(--accent-blue)]" />
                        Debate Arena
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!isDebating && !stages && !error && (
                        <div className="max-w-2xl space-y-3">
                            <Input
                                value={topic}
                                onChange={(e) => { setTopic(e.target.value); if (inputError) setInputError(null); }}
                                placeholder="Enter a debate topic..."
                                className="bg-[var(--bg-elevated)] border-[var(--border)] h-11 text-sm focus-visible:ring-[var(--accent-blue)]/50"
                            />
                            <div className="flex gap-3 items-center">
                                <Input
                                    value={rounds}
                                    onChange={(e) => setRounds(e.target.value)}
                                    type="number"
                                    min={1}
                                    max={10}
                                    className="bg-[var(--bg-elevated)] border-[var(--border)] h-11 w-24 text-sm"
                                    placeholder="Rounds"
                                />
                                <span className="text-xs text-[var(--text-muted)]">debate rounds</span>
                            </div>
                            {inputError && (
                                <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs">
                                    <AlertCircle className="w-3 h-3" /> {inputError}
                                </div>
                            )}
                            <Button
                                onClick={startDebate}
                                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white w-full shadow-lg shadow-[var(--glow-blue)]"
                                disabled={!topic.trim()}
                            >
                                Start Debate
                            </Button>
                        </div>
                    )}

                    {/* Skeleton loading */}
                    {isDebating && stages && stages.length === 0 && (
                        <div className="space-y-5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4 items-start">
                                    <Skeleton className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3 w-28 bg-[var(--bg-elevated)]" />
                                        <Skeleton className="h-20 w-full rounded-lg bg-[var(--bg-elevated)]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="bg-[var(--accent-red)]/5 text-[var(--accent-red)] p-4 rounded-xl border border-[var(--accent-red)]/20 text-sm">
                            {error}
                            <Button variant="link" className="text-[var(--accent-red)] p-0 h-auto mt-2 text-xs block" onClick={() => { setError(null); setTopic(""); setStages(null); }}>
                                Reset
                            </Button>
                        </div>
                    )}

                    {/* Timeline */}
                    {stages && (
                        <div className="relative pl-8 space-y-5 before:absolute before:left-[15px] before:top-0 before:bottom-0 before:w-px before:bg-[var(--border)]">
                            {stages.map((s, i) => {
                                const isCritic = s.role === "critic";
                                const color = isCritic ? "var(--accent-amber)" : "var(--accent-blue)";
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

                    {isDebating && stages && (
                        <div className="flex justify-end border-t border-[var(--border)] pt-4 mt-6">
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

                    {consensus && (
                        <div className="bg-[var(--accent-green)]/5 border border-[var(--accent-green)]/20 rounded-xl p-5 animate-slide-up">
                            <div className="flex items-center gap-2 font-semibold text-[var(--accent-green)] text-xs uppercase tracking-wider mb-3">
                                <CheckCircle2 className="w-4 h-4" />
                                Consensus
                            </div>
                            <MarkdownRenderer content={consensus} />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-4 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10"
                                onClick={() => { setStages(null); setConsensus(null); setTopic(""); }}
                            >
                                New Debate <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
