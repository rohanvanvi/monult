/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

export default function RouterPage() {
    const [prompt, setPrompt] = useLocalStorage("monult_router_prompt", "");
    const [isRouting, setIsRouting] = useState(false);
    const [result, setResult] = useLocalStorage<any>("monult_router_result", null);
    const [error, setError] = useState<string | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);

    const validate = (): boolean => {
        if (!prompt.trim()) { setInputError("Prompt is required"); return false; }
        if (prompt.trim().length < 3) { setInputError("Prompt must be at least 3 characters"); return false; }
        setInputError(null);
        return true;
    };

    const handleRoute = async () => {
        if (!validate()) return;
        setIsRouting(true);
        setError(null);
        setResult(null);

        try {
            const res = await api.route(prompt);
            setResult(res);
        } catch (err: any) {
            setError(err.message || "Routing failed");
        } finally {
            setIsRouting(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Smart Router</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    Test how Monult routes prompts to the optimal model
                </p>
            </div>

            <Card className="glass-card border-[var(--border)] max-w-3xl">
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <Input
                                value={prompt}
                                onChange={(e) => { setPrompt(e.target.value); if (inputError) setInputError(null); }}
                                placeholder="Enter a task to see routing decisions..."
                                className="bg-[var(--bg-elevated)] border-[var(--border)] h-11 focus-visible:ring-[var(--accent-blue)]/50 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && handleRoute()}
                            />
                            <Button
                                onClick={handleRoute}
                                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white h-11 px-6 shadow-lg shadow-[var(--glow-blue)]"
                                disabled={!prompt.trim() || isRouting}
                            >
                                <Compass className="w-4 h-4 mr-2" />
                                Route
                            </Button>
                        </div>
                        {inputError && (
                            <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs">
                                <AlertCircle className="w-3 h-3" /> {inputError}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[var(--border)] pt-6">
                        {isRouting ? (
                            <div className="space-y-4">
                                <Skeleton className="h-5 w-40 bg-[var(--bg-elevated)]" />
                                <Skeleton className="h-20 w-full rounded-xl bg-[var(--bg-elevated)]" />
                            </div>
                        ) : error ? (
                            <div className="bg-[var(--accent-red)]/5 text-[var(--accent-red)] p-4 rounded-xl border border-[var(--accent-red)]/20 text-sm">
                                {error}
                            </div>
                        ) : result ? (
                            <div className="animate-slide-up space-y-4">
                                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                                    <div className="flex items-center justify-between p-4">
                                        <span className="text-xs text-[var(--text-muted)]">Provider</span>
                                        <span className="text-sm font-semibold text-white">{result.model?.provider || result.provider || "Auto"}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4">
                                        <span className="text-xs text-[var(--text-muted)]">Model</span>
                                        <span className="text-sm font-mono text-[var(--accent-blue)]">{result.model?.id || result.model || "Default"}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4">
                                        <span className="text-xs text-[var(--text-muted)]">Strategy</span>
                                        <Badge variant="outline" className="text-[10px] border-[var(--border)] text-[var(--accent-purple)]">
                                            {(result.strategy || "balanced").toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-4">
                                        <span className="text-xs text-[var(--text-muted)]">Estimated Cost</span>
                                        <span className="text-sm font-mono font-bold text-[var(--accent-green)]">${(result.estimatedCost || 0).toFixed(4)}</span>
                                    </div>
                                    {result.reasoning && (
                                        <div className="p-4">
                                            <span className="text-xs text-[var(--text-muted)] block mb-2">Reasoning</span>
                                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{result.reasoning}</p>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[var(--text-muted)] hover:text-white"
                                    onClick={() => { setResult(null); setPrompt(""); }}
                                >
                                    Test Another <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
                                Enter a prompt above to see how the router selects the optimal provider and model.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
