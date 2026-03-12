/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState, useEffect } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    Bot, 
    User, 
    FileText, 
    Terminal, 
    AlertCircle, 
    CheckCircle, 
    Clock, 
    Play, 
    StopCircle,
    Wifi,
    WifiOff
} from "lucide-react";
import { api } from "@/lib/api";

type DevTeamEvent = {
    type: 'leader_start' | 'leader_progress' | 'leader_complete' | 'agent_start' | 'agent_progress' | 'agent_complete' | 'file_created' | 'command_executed' | 'consensus_reached' | 'error';
    agent?: string;
    task?: string;
    progress?: string;
    data?: any;
    timestamp: number;
};

export default function DevTeamPage() {
    const { events, isConnected, clearEvents, addEvent, setupEventSource, cleanupEventSource } = useDashboardData();
    const [task, setTask] = useState("");
    const [workspace, setWorkspace] = useState("");
    const [agents, setAgents] = useState<string[]>([]);
    const [enableConsensus, setEnableConsensus] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task.trim()) return;

        setError(null);
        setIsRunning(true);
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/api/agent-assembly`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task: task.trim(),
                    workspace: workspace.trim() || undefined,
                    agents: agents.length > 0 ? agents : undefined,
                    enableConsensus
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.trim().startsWith("data: ")) {
                            const dataStr = line.replace(/^data:\s*/, "").trim();
                            if (!dataStr || dataStr === "{}") continue;

                            try {
                                const event = JSON.parse(dataStr);
                                
                                // Add event to the dashboard events list
                                const devTeamEvent: DevTeamEvent = {
                                    type: event.type || 'leader_progress',
                                    agent: event.agent,
                                    task: event.task,
                                    progress: event.progress,
                                    data: event.data,
                                    timestamp: Date.now()
                                };
                                
                                // Update events through the hook
                                addEvent(devTeamEvent);

                                if (event.type === "error") {
                                    setError(event.data?.error || "An error occurred");
                                    setIsRunning(false);
                                } else if (event.type === "done") {
                                    setIsRunning(false);
                                }
                            } catch (e) {
                                // Ignore parse errors for partial chunks
                            }
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || "Failed to start DevTeam");
            setIsRunning(false);
        }
    };

    const handleStop = () => {
        setIsRunning(false);
        cleanupEventSource();
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'leader_start':
            case 'agent_start':
                return <Play className="w-4 h-4 text-green-500" />;
            case 'leader_complete':
            case 'agent_complete':
                return <CheckCircle className="w-4 h-4 text-blue-500" />;
            case 'file_created':
                return <FileText className="w-4 h-4 text-purple-500" />;
            case 'command_executed':
                return <Terminal className="w-4 h-4 text-orange-500" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'consensus_reached':
                return <Bot className="w-4 h-4 text-indigo-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'leader_start':
            case 'agent_start':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'leader_complete':
            case 'agent_complete':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'file_created':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'command_executed':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'error':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'consensus_reached':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">DevTeam</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Real AI development teams that perform actual work
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${isConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                        {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                    <Button
                        variant="outline"
                        onClick={isConnected ? cleanupEventSource : setupEventSource}
                        className="text-[var(--text-faint)] hover:text-white h-8 text-sm"
                    >
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <Card className="glass-card border-[var(--border)]">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Task</label>
                                <Textarea
                                    value={task}
                                    onChange={(e) => setTask(e.target.value)}
                                    placeholder="Describe the development task..."
                                    className="bg-[var(--bg-elevated)] border-[var(--border)] min-h-[80px]"
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Workspace (optional)</label>
                                <Input
                                    value={workspace}
                                    onChange={(e) => setWorkspace(e.target.value)}
                                    placeholder="Custom workspace path..."
                                    className="bg-[var(--bg-elevated)] border-[var(--border)]"
                                    disabled={isRunning}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Agents (optional)</label>
                                <Input
                                    value={agents.join(', ')}
                                    onChange={(e) => setAgents(e.target.value.split(',').map(a => a.trim()).filter(Boolean))}
                                    placeholder="frontend, backend, security..."
                                    className="bg-[var(--bg-elevated)] border-[var(--border)]"
                                    disabled={isRunning}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Consensus</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={enableConsensus}
                                        onChange={(e) => setEnableConsensus(e.target.checked)}
                                        disabled={isRunning}
                                        className="w-4 h-4 text-blue-600 bg-[var(--bg-elevated)] border-[var(--border)] rounded"
                                    />
                                    <span className="text-sm text-[var(--text-primary)]">Enable consensus</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Actions</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        disabled={isRunning || !task.trim()}
                                        className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white h-10 px-4 rounded-lg shadow-lg shadow-[var(--glow-blue)] transition-all disabled:opacity-50"
                                    >
                                        {isRunning ? 'Running...' : 'Start DevTeam'}
                                    </Button>
                                    {isRunning && (
                                        <Button
                                            type="button"
                                            onClick={handleStop}
                                            variant="outline"
                                            className="text-[var(--text-faint)] hover:text-white h-10 px-4 rounded-lg border-[var(--border)]"
                                        >
                                            Stop
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/50 px-3 py-2 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Events */}
            <Card className="glass-card border-[var(--border)]">
                <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">Real-time Events</h2>
                        <div className="flex gap-2">
                            <Button
                                onClick={clearEvents}
                                variant="outline"
                                className="text-[var(--text-faint)] hover:text-white h-8 text-sm"
                                disabled={events.length === 0}
                            >
                                Clear Events
                            </Button>
                            <span className="text-sm text-[var(--text-muted)]">
                                {events.length} events
                            </span>
                        </div>
                    </div>
                    
                    <Separator className="mb-4" />
                    
                    <div className="h-[400px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 overflow-y-auto">
                        {events.length === 0 ? (
                            <div className="text-center text-[var(--text-muted)] py-8">
                                No events yet. Start a DevTeam task to see real-time progress.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {events.map((event, index) => (
                                    <div
                                        key={index}
                                        className="flex gap-3 animate-slide-up"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] flex items-center justify-center shrink-0 mt-0.5">
                                            {getEventIcon(event.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-xs px-2 py-0.5 h-auto border ${getEventColor(event.type)}`}>
                                                    {event.type.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                                {event.agent && (
                                                    <span className="text-xs text-[var(--text-muted)]">by {event.agent}</span>
                                                )}
                                                <span className="text-xs text-[var(--text-faint)]">{formatTimestamp(event.timestamp)}</span>
                                            </div>
                                            <div className="text-sm text-[var(--text-primary)] leading-relaxed">
                                                {event.progress && (
                                                    <div className="text-[var(--text-muted)] mb-1">Progress: {event.progress}</div>
                                                )}
                                                {event.data && event.data.error && (
                                                    <div className="text-red-400 bg-red-500/10 border border-red-500/50 px-2 py-1 rounded text-xs">
                                                        Error: {event.data.error}
                                                    </div>
                                                )}
                                                {event.data && event.data.output && (
                                                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] px-2 py-1 rounded text-xs">
                                                        {event.data.output}
                                                    </div>
                                                )}
                                                {event.data && event.data.path && (
                                                    <div className="text-purple-400 bg-purple-500/10 border border-purple-500/50 px-2 py-1 rounded text-xs">
                                                        File: {event.data.path}
                                                    </div>
                                                )}
                                                {event.data && event.data.command && (
                                                    <div className="text-orange-400 bg-orange-500/10 border border-orange-500/50 px-2 py-1 rounded text-xs">
                                                        Command: {event.data.command}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
