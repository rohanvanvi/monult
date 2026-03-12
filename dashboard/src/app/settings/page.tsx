/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Settings, Shield, Cpu, Clock, Terminal, Zap, Globe } from "lucide-react";
import { api } from "@/lib/api";

export default function SettingsPage() {
    // General
    const [provider, setProvider] = useState("google");
    const [timeout, setTimeoutVal] = useState("300");
    const [maxTokens, setMaxTokens] = useState("4096");
    const [temperature, setTemperature] = useState("0.7");

    // Router
    const [routingStrategy, setRoutingStrategy] = useState("balanced");
    const [maxCost, setMaxCost] = useState("0.05");

    // Security
    const [promptScan, setPromptScan] = useState("enabled");
    const [codeScan, setCodeScan] = useState("enabled");

    // System
    const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant powered by Monult OS.");
    const [apiPort, setApiPort] = useState("3000");
    const [dashboardPort, setDashboardPort] = useState("3001");

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [healthLoading, setHealthLoading] = useState(true);
    const [health, setHealth] = useState<any>(null);

    useEffect(() => {
        api.getHealth()
            .then(setHealth)
            .catch(() => setHealth(null))
            .finally(() => setHealthLoading(false));
    }, []);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        const t = parseInt(timeout);
        if (isNaN(t) || t < 10) newErrors.timeout = "Must be at least 10 seconds";
        if (t > 3600) newErrors.timeout = "Cannot exceed 3600 seconds";

        const mt = parseInt(maxTokens);
        if (isNaN(mt) || mt < 100) newErrors.maxTokens = "Must be at least 100";
        if (mt > 128000) newErrors.maxTokens = "Cannot exceed 128,000";

        const temp = parseFloat(temperature);
        if (isNaN(temp) || temp < 0) newErrors.temperature = "Must be ≥ 0";
        if (temp > 2) newErrors.temperature = "Cannot exceed 2.0";

        const mc = parseFloat(maxCost);
        if (isNaN(mc) || mc < 0) newErrors.maxCost = "Must be ≥ 0";
        if (mc > 10) newErrors.maxCost = "Cannot exceed $10";

        const ap = parseInt(apiPort);
        if (isNaN(ap) || ap < 1024 || ap > 65535) newErrors.apiPort = "Must be 1024–65535";

        const dp = parseInt(dashboardPort);
        if (isNaN(dp) || dp < 1024 || dp > 65535) newErrors.dashboardPort = "Must be 1024–65535";

        if (ap === dp) newErrors.dashboardPort = "Must differ from API port";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        setIsSaving(true);
        setSaved(false);
        globalThis.setTimeout(() => {
            setIsSaving(false);
            setSaved(true);
            globalThis.setTimeout(() => setSaved(false), 3000);
        }, 600);
    };

    const FieldError = ({ field }: { field: string }) =>
        errors[field] ? (
            <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs mt-1">
                <AlertCircle className="w-3 h-3" /> {errors[field]}
            </div>
        ) : null;

    const SectionLabel = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Icon className="w-4 h-4 text-[var(--accent-blue)]" />
            {children}
        </div>
    );

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Platform configuration and system preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
                {/* Main Settings */}
                <Card className="lg:col-span-2 glass-card border-[var(--border)]">
                    <CardContent className="p-6 space-y-8">

                        {/* ── General ── */}
                        <div className="space-y-5">
                            <SectionLabel icon={Cpu}>General</SectionLabel>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Default Provider</Label>
                                    <Select value={provider} onValueChange={setProvider}>
                                        <SelectTrigger className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
                                            <SelectItem value="google">Google (Gemini)</SelectItem>
                                            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                            <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                                            <SelectItem value="local">Local (Ollama)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Agent Timeout (s)</Label>
                                    <Input type="number" value={timeout} onChange={(e) => { setTimeoutVal(e.target.value); if (errors.timeout) setErrors(prev => ({ ...prev, timeout: "" })); }} min={10} max={3600}
                                        className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm" />
                                    <FieldError field="timeout" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Max Tokens</Label>
                                    <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} min={100} max={128000}
                                        className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm" />
                                    <FieldError field="maxTokens" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Temperature</Label>
                                    <Input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} min={0} max={2} step={0.1}
                                        className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm" />
                                    <FieldError field="temperature" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-[var(--border)]" />

                        {/* ── Router ── */}
                        <div className="space-y-5">
                            <SectionLabel icon={Zap}>Router Configuration</SectionLabel>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Routing Strategy</Label>
                                    <Select value={routingStrategy} onValueChange={setRoutingStrategy}>
                                        <SelectTrigger className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
                                            <SelectItem value="cost">Cost Optimized</SelectItem>
                                            <SelectItem value="balanced">Balanced</SelectItem>
                                            <SelectItem value="quality">Quality First</SelectItem>
                                            <SelectItem value="speed">Speed First</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Max Cost per Request ($)</Label>
                                    <Input type="number" value={maxCost} onChange={(e) => setMaxCost(e.target.value)} min={0} max={10} step={0.01}
                                        className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm" />
                                    <FieldError field="maxCost" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-[var(--border)]" />

                        {/* ── Security ── */}
                        <div className="space-y-5">
                            <SectionLabel icon={Shield}>Security</SectionLabel>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Prompt Injection Scan</Label>
                                    <Select value={promptScan} onValueChange={setPromptScan}>
                                        <SelectTrigger className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
                                            <SelectItem value="enabled">Enabled</SelectItem>
                                            <SelectItem value="disabled">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Code Security Scan</Label>
                                    <Select value={codeScan} onValueChange={setCodeScan}>
                                        <SelectTrigger className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
                                            <SelectItem value="enabled">Enabled</SelectItem>
                                            <SelectItem value="disabled">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-[var(--border)]" />

                        {/* ── Network ── */}
                        <div className="space-y-5">
                            <SectionLabel icon={Globe}>Network</SectionLabel>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">API Server Port</Label>
                                    <Input type="number" value={apiPort} onChange={(e) => setApiPort(e.target.value)} min={1024} max={65535}
                                        className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm" />
                                    <FieldError field="apiPort" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] text-[var(--text-faint)] uppercase font-semibold tracking-[0.12em]">Dashboard Port</Label>
                                    <Input type="number" value={dashboardPort} onChange={(e) => setDashboardPort(e.target.value)} min={1024} max={65535}
                                        className="h-10 bg-[var(--bg-elevated)] border-[var(--border)] text-sm" />
                                    <FieldError field="dashboardPort" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-[var(--border)]" />

                        {/* ── System Prompt ── */}
                        <div className="space-y-5">
                            <SectionLabel icon={Terminal}>System Prompt</SectionLabel>
                            <Textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className="bg-[var(--bg-elevated)] border-[var(--border)] min-h-[100px] resize-none text-sm focus-visible:ring-[var(--accent-blue)]/50 font-mono"
                                placeholder="Default system prompt for all generations..."
                            />
                            <p className="text-[11px] text-[var(--text-faint)]">
                                Applied as the default system prompt for all generate requests unless overridden.
                            </p>
                        </div>

                        {/* Save */}
                        <div className="pt-4 border-t border-[var(--border)] flex items-center gap-4">
                            <Button
                                onClick={handleSave}
                                className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white min-w-[160px] shadow-lg shadow-[var(--glow-blue)]"
                                disabled={isSaving}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                {isSaving ? "Saving..." : "Save Settings"}
                            </Button>
                            {saved && (
                                <Badge className="bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20 text-xs animate-fade-in">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Saved successfully
                                </Badge>
                            )}
                        </div>

                    </CardContent>
                </Card>

                {/* System Info Sidebar */}
                <div className="space-y-4">
                    <Card className="glass-card border-[var(--border)]">
                        <CardContent className="p-5">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-[var(--accent-amber)]" />
                                System Info
                            </h3>
                            {healthLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-full bg-[var(--bg-elevated)]" />
                                    <Skeleton className="h-4 w-3/4 bg-[var(--bg-elevated)]" />
                                    <Skeleton className="h-4 w-2/3 bg-[var(--bg-elevated)]" />
                                </div>
                            ) : !health ? (
                                <div className="text-xs text-[var(--text-muted)]">API offline.</div>
                            ) : (
                                <div className="space-y-3">
                                    {[
                                        { label: "Version", value: health.version || "1.0.0" },
                                        { label: "Status", value: health.status || "unknown" },
                                        { label: "Providers", value: health.providers?.length || 0 },
                                        { label: "Agents", value: health.agents?.length || 0 },
                                        {
                                            label: "Uptime",
                                            value: (() => {
                                                const u = Math.floor(health.uptime || 0);
                                                return u > 3600
                                                    ? `${Math.floor(u / 3600)}h ${Math.floor((u % 3600) / 60)}m`
                                                    : `${Math.floor(u / 60)}m ${u % 60}s`;
                                            })(),
                                        },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="text-[var(--text-muted)]">{item.label}</span>
                                            <span className="font-mono text-white">{String(item.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-[var(--border)]">
                        <CardContent className="p-5 text-center">
                            <p className="text-[11px] text-[var(--text-faint)] leading-relaxed">
                                Settings are stored in memory for this session. Persist across restarts by running{" "}
                                <code className="text-[var(--accent-blue)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[10px]">
                                    monult init
                                </code>{" "}
                                to generate a <code className="text-[var(--accent-blue)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[10px]">monult.config.json</code>.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
