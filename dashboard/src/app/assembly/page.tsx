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
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Blocks, CheckCircle2, CircleDashed, AlertCircle, ArrowRight, Loader2, StopCircle, RefreshCw, Cpu, Bot } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { API_BASE } from "@/lib/api";

type Stage = {
    role: string;
    agent?: string;
    model?: string;
    output?: string;
    response?: { content: string };
    isThinking?: boolean;
};

export default function AssemblyPage() {

    const [task, setTask] = useLocalStorage("monult_assembly_task", "");
    const [isAssembling, setIsAssembling] = useState(false);
    const [timeline, setTimeline] = useLocalStorage<Stage[] | null>("monult_assembly_timeline", null);
    const [consensus, setConsensus] = useLocalStorage<string | null>("monult_assembly_consensus", null);
    const [error, setError] = useState<string | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);
    const [mode, setMode] = useState<"models" | "agents">("models");
    const { data } = useDashboardData();
    const modelsList = data?.models || [];
    const [selectedModel, setSelectedModel] = useLocalStorage("monult_assembly_model", "");

    // Auto-scrolling ref and user scroll tracking
    const bottomRef = useRef<HTMLDivElement>(null);
    const isUserScrolling = useRef(false);
    const lastScrollTime = useRef(Date.now());
    // Abort controller ref to stop generation
    const abortControllerRef = useRef<AbortController | null>(null);

    // Track user scrolling
    useEffect(() => {
        const handleScroll = () => {
            isUserScrolling.current = true;
            lastScrollTime.current = Date.now();
            setTimeout(() => {
                isUserScrolling.current = false;
            }, 1000); // Reset after 1 second of no scrolling
        };

        const container = bottomRef.current?.parentElement;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // Auto-scroll to bottom only when user hasn't scrolled recently
    useEffect(() => {
        if (isAssembling && timeline && !isUserScrolling.current) {
            const timeoutId = setTimeout(() => {
                const timeSinceLastScroll = Date.now() - lastScrollTime.current;
                if (timeSinceLastScroll > 2000) { // Only auto-scroll if user hasn't scrolled for 2 seconds
                    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                }
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [timeline, isAssembling]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsAssembling(false);
            if (!consensus) {
                setConsensus("Pipeline manually stopped.");
            }
        }
    };

    const validate = (): boolean => {
        if (!task.trim()) { setInputError("Task description is required"); return false; }
        if (task.trim().length < 5) { setInputError("Task must be at least 5 characters"); return false; }
        setInputError(null);
        return true;
    };

    const handleStart = async () => {
        if (!validate()) return;
        setIsAssembling(true);
        const initialTimeline: Stage[] = [{
            role: "user",
            model: "You",
            output: task,
            isThinking: false
        }];
        setTimeline(initialTimeline);
        setConsensus(null);
        setError(null);

        try {
            abortControllerRef.current = new AbortController();

            const endpoint = mode === "models" ? `${API_BASE}/assembly/stream` : `${API_BASE}/agent-assembly/stream`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mode === "models" ? { 
                    prompt: task,
                    ...(selectedModel ? { models: [selectedModel] } : {}) 
                } : { 
                    task: task, leaderSelection: true 
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                let errMessage = "Assembly failed";
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

            let currentTimeline: Stage[] = [...initialTimeline];

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
                                    agent: event.agent,
                                    output: "",
                                    isThinking: true
                                };
                                currentTimeline = [...currentTimeline, newStage];
                                setTimeline([...currentTimeline]);
                            } else if (event.type === "stage_chunk") {
                                // Find the last stage that matches the current agent/model
                                const activeStageIndex = currentTimeline.findLastIndex(s => 
                                    s.isThinking && 
                                    (s.agent === event.agent || s.model === event.model)
                                );
                                if (activeStageIndex !== -1) {
                                    const stage = currentTimeline[activeStageIndex];
                                    stage.output = (stage.output || "") + event.chunk;
                                    setTimeline([...currentTimeline]);
                                }
                            } else if (event.type === "stage_complete") {
                                // Find the stage that matches the completed agent/model/role
                                const completeStageIndex = currentTimeline.findLastIndex(s => 
                                    s.isThinking && 
                                    (
                                        (s.agent && (s.agent === event.data?.agentName || s.agent === event.agent)) ||
                                        (s.model && (s.model === event.data?.model || s.model === event.model)) ||
                                        (s.role === event.role || s.role === event.stage)
                                    )
                                );
                                if (completeStageIndex !== -1) {
                                    currentTimeline[completeStageIndex].isThinking = false;
                                    // Update the stage with completion data
                                    if (event.data?.output) {
                                        currentTimeline[completeStageIndex].output = event.data.output;
                                    }
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
                setError(err.message || "Assembly stream failed.");
            }
        } finally {
            setIsAssembling(false);
        }
    };

    const roleColors: Record<string, string> = {
        proposer: "var(--accent-blue)",
        critic: "var(--accent-amber)",
        improver: "var(--accent-green)",
        default: "var(--accent-purple)",
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Multi-Agent Assembly</h1>
                <div className="text-sm text-[var(--text-muted)] mt-1 flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                        <span>Multi-agent workflow and synthesis visualization</span>
                        {mode === "models" && modelsList.length > 0 && (
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-xs px-2 py-1 text-white outline-none"
                            >
                                <option value="">Auto-select Best Models</option>
                                {modelsList.map((m: any, idx: number) => {
                                    const id = typeof m === "string" ? m : m.id;
                                    const name = typeof m === "string" ? m : m.name || m.id;
                                    return <option key={idx} value={id}>{name}</option>;
                                })}
                            </select>
                        )}
                    </div>
                    {timeline && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setTimeline(null); setConsensus(null); setTask(""); }}
                            className="text-[var(--text-faint)] hover:text-white h-7 text-xs"
                        >
                            Clear Results
                        </Button>
                    )}
                </div>
            </div>

            <Card className="glass-card border-[var(--border)]">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                            <Blocks className="w-4 h-4 text-[var(--accent-blue)]" />
                            Assembly Pipeline
                        </CardTitle>
                        <Badge
                            className={`text-[10px] ${isAssembling
                                ? "bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border-[var(--accent-amber)]/20"
                                : consensus
                                    ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20"
                                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border)]"
                                }`}
                        >
                            {isAssembling ? "Processing" : consensus ? "Complete" : "Idle"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Input */}
                    {!isAssembling && !timeline && !error && (
                        <div className="max-w-2xl space-y-3">
                            <Textarea
                                value={task}
                                onChange={(e) => { setTask(e.target.value); if (inputError) setInputError(null); }}
                                placeholder="Describe the task for your agent team (e.g., Design a microservices architecture for an e-commerce platform)..."
                                className="bg-[var(--bg-elevated)] border-[var(--border)] min-h-[100px] resize-none focus-visible:ring-[var(--accent-blue)]/50 text-sm"
                            />
                            {inputError && (
                                <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs">
                                    <AlertCircle className="w-3 h-3" /> {inputError}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-1 shrink-0 h-10 overflow-hidden">
                                    <button
                                        onClick={() => setMode("models")}
                                        className={`flex items-center gap-2 px-3 text-xs font-medium rounded-sm transition-colors ${mode === "models" ? "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]" : "text-[var(--text-muted)] hover:text-white"}`}
                                    >
                                        <Cpu className="w-3.5 h-3.5" /> Models
                                    </button>
                                    <button
                                        onClick={() => setMode("agents")}
                                        className={`flex items-center gap-2 px-3 text-xs font-medium rounded-sm transition-colors ${mode === "agents" ? "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]" : "text-[var(--text-muted)] hover:text-white"}`}
                                    >
                                        <Bot className="w-3.5 h-3.5" /> Agents
                                    </button>
                                </div>
                                <Button
                                    onClick={handleStart}
                                    className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white w-full shadow-lg shadow-[var(--glow-blue)] h-10"
                                    disabled={!task.trim()}
                                >
                                    Deploy Assembly
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-[var(--accent-red)]/5 text-[var(--accent-red)] p-4 rounded-xl border border-[var(--accent-red)]/20 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">{error}</p>
                                <Button variant="link" className="text-[var(--accent-red)] p-0 h-auto mt-2 text-xs" onClick={() => { setError(null); setTask(""); setTimeline(null); }}>
                                    Reset Pipeline
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Initial Skeleton before first AI event */}
                    {isAssembling && timeline && timeline.length === 1 && (
                        <div className="space-y-4">
                            {[1].map((i) => (
                                <div key={i} className="flex gap-4 items-start animate-pulse-soft" style={{ animationDelay: `${i * 200}ms` }}>
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3 w-32 bg-[var(--bg-elevated)]" />
                                        <Skeleton className="h-16 w-full bg-[var(--bg-elevated)] rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Timeline */}
                    {timeline && timeline.length > 0 && (
                        <div className="relative pl-8 space-y-6 before:absolute before:left-[15px] before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-[var(--accent-blue)] before:via-[var(--border)] before:to-[var(--accent-green)]">
                            {timeline.map((stage, idx) => {
                                const color = roleColors[stage.role] || roleColors.default;
                                return (
                                    <div key={idx} className="relative animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div
                                            className="absolute -left-8 top-1 w-7 h-7 rounded-full border-2 bg-[var(--bg-card)] flex items-center justify-center z-10"
                                            style={{ borderColor: color }}
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        </div>
                                        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--text-faint)] transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-[10px] border-[var(--border)]" style={{ color }}>
                                                    {stage.role.toUpperCase()}
                                                </Badge>
                                                <span className="text-[10px] text-[var(--text-faint)] font-mono flex items-center gap-2">
                                                    {(stage.role === "orchestrator" ? "SYSTEM" : stage.agent || stage.model || "SYSTEM").toUpperCase()}
                                                    {stage.role === "user" ? null : stage.isThinking && (
                                                        <span className="text-[10px] text-[var(--text-muted)] flex items-center">
                                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> generating...
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <MarkdownRenderer
                                                content={stage.output || stage.response?.content || (stage.isThinking ? "Thinking..." : "")}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>
                    )}

                    {/* Loading indicator while assembling with partial results */}
                    {isAssembling && timeline && (
                        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-6">
                            <div className="relative pl-8 flex items-center h-8">
                                <div className="absolute left-0 top-1 flex items-center justify-center">
                                    <CircleDashed className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                                </div>
                                <p className="text-sm text-[var(--text-muted)] animate-pulse-soft">
                                    {(() => {
                                        const active = timeline.find(s => s.isThinking);
                                        const name = active ? (active.agent || active.model) : null;
                                        if (name) return `${name.toUpperCase()} is thinking...`;
                                        return mode === "models" ? "Models are collaborating..." : "Agents are constructing response...";
                                    })()}
                                </p>
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

                    {/* Consensus */}
                    {consensus && (
                        <div className="bg-[var(--accent-green)]/5 border border-[var(--accent-green)]/20 rounded-xl p-5 animate-slide-up">
                            <div className="flex items-center gap-2 font-semibold text-[var(--accent-green)] text-xs uppercase tracking-wider mb-3">
                                <CheckCircle2 className="w-4 h-4" />
                                Consensus Reached
                            </div>
                            <MarkdownRenderer content={consensus} />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-4 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10"
                                onClick={() => { setTimeline(null); setConsensus(null); setTask(""); }}
                            >
                                New Assembly <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
