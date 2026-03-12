/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal, Bot, Bug, HardHat, Shield, Rocket, FileText, Play, AlertCircle, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

const ICON_MAP: Record<string, any> = {
    debugger: Bug, architect: HardHat, security: Shield, devops: Rocket, docs: FileText,
};

function AgentsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const agentId = searchParams?.get("id");
    const { data, loading } = useDashboardData();

    const [input, setInput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState("");
    const [inputError, setInputError] = useState<string | null>(null);

    const agents = data.agents;

    useEffect(() => {
        if (agentId) {
            setTerminalOutput(`monult > agent ${agentId} ready\n`);
            setInput("");
        }
    }, [agentId]);

    const validate = (): boolean => {
        if (!input.trim()) { setInputError("Task instruction is required"); return false; }
        if (input.trim().length < 3) { setInputError("Instruction must be at least 3 characters"); return false; }
        setInputError(null);
        return true;
    };

    const runAgent = async () => {
        if (!validate() || !agentId) return;
        setIsRunning(true);
        setTerminalOutput(prev => prev + `\nmonult > deploying ${agentId}...\n`);

        try {
            const res = await api.runAgent(agentId, input);
            setTerminalOutput(prev => prev + `\n[SUCCESS]\n${res.output || JSON.stringify(res, null, 2)}\n\nmonult > `);
        } catch (err: any) {
            setTerminalOutput(prev => prev + `\n[ERROR] ${err.message}\n\nmonult > `);
        } finally {
            setIsRunning(false);
            setInput("");
        }
    };

    // Agent List
    if (!agentId) {
        return (
            <div className="animate-fade-in space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Agents</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Autonomous AI actors for specialized tasks</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
                    {loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl bg-[var(--bg-elevated)]" />
                        ))
                        : agents.length === 0
                            ? <div className="col-span-full text-sm text-[var(--text-muted)]">No agents configured.</div>
                            : agents.map((agt: any, idx: number) => {
                                const Icon = ICON_MAP[agt.name] || Bot;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => router.push(`/agents?id=${agt.name}`)}
                                        className="glass-card border border-[var(--border)] rounded-xl p-5 cursor-pointer hover:border-[var(--accent-blue)]/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-blue)]/10 to-[var(--accent-purple)]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                <Icon className="w-5 h-5 text-[var(--accent-blue)]" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-white truncate">
                                                    {agt.name.charAt(0).toUpperCase() + agt.name.slice(1)}
                                                </div>
                                                <div className="text-[11px] text-[var(--text-faint)] truncate">
                                                    {agt.description || "Autonomous Agent"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                </div>
            </div>
        );
    }

    // Agent Terminal
    return (
        <div className="animate-fade-in flex flex-col h-[calc(100vh-5rem)]">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push("/agents")} className="text-[var(--text-muted)] hover:text-white -ml-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {agentId.charAt(0).toUpperCase() + agentId.slice(1)}
                        </h1>
                        <Badge className="bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20 text-[10px]">
                            Agent
                        </Badge>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">Execute tasks with the {agentId} agent</p>
                </div>
            </div>

            <div className="space-y-3 max-w-2xl mb-6">
                <Input
                    value={input}
                    onChange={(e) => { setInput(e.target.value); if (inputError) setInputError(null); }}
                    placeholder="Enter task instructions..."
                    className="bg-[var(--bg-elevated)] border-[var(--border)] h-11 text-sm focus-visible:ring-[var(--accent-blue)]/50"
                    onKeyDown={(e) => e.key === "Enter" && runAgent()}
                    disabled={isRunning}
                />
                {inputError && (
                    <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs">
                        <AlertCircle className="w-3 h-3" /> {inputError}
                    </div>
                )}
                <Button onClick={runAgent} className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white w-full shadow-lg shadow-[var(--glow-blue)]" disabled={!input.trim() || isRunning}>
                    <Play className="w-4 h-4 mr-2" />
                    {isRunning ? "Running..." : "Execute"}
                </Button>
            </div>

            <Card className="glass-card border-[var(--border)] flex-1 min-h-0 flex flex-col">
                <CardContent className="flex-1 p-0 min-h-0">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)]">
                        <Terminal className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                        <span className="text-[11px] text-[var(--text-faint)] font-mono">terminal</span>
                    </div>
                    <div className="p-5 font-mono text-sm text-[var(--accent-green)] whitespace-pre-wrap overflow-y-auto h-full bg-[var(--bg-root)]/50">
                        {terminalOutput}
                        {isRunning && <span className="animate-pulse-soft">▊</span>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AgentsPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6 animate-fade-in">
                <Skeleton className="h-8 w-32 bg-[var(--bg-elevated)]" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-[var(--bg-elevated)]" />)}
                </div>
            </div>
        }>
            <AgentsContent />
        </Suspense>
    );
}
