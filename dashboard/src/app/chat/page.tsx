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
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, AlertCircle } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { api, API_BASE } from "@/lib/api";

type Message = {
    role: "user" | "ai";
    content: string;
    model?: string;
    tokens?: number;
    timestamp: number;
    isStreaming?: boolean;
};

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem("monult_chat_history");
            if (saved) setMessages(JSON.parse(saved));
        } catch (e) { }
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;
        if (!messages.some(m => m.isStreaming)) {
            window.localStorage.setItem("monult_chat_history", JSON.stringify(messages));
        }
    }, [messages, isClient]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);
    const { data } = useDashboardData();
    const models = data?.models || [];
    const [selectedModel, setSelectedModel] = useLocalStorage("monult_chat_model", "");
    const scrollRef = useRef<HTMLDivElement>(null);
    const isUserScrolling = useRef(false);
    const lastScrollTime = useRef(Date.now());

    // Track user scrolling to prevent auto-scroll interference
    useEffect(() => {
        const handleScroll = () => {
            isUserScrolling.current = true;
            lastScrollTime.current = Date.now();
            setTimeout(() => {
                isUserScrolling.current = false;
            }, 1000); // Reset after 1 second of no scrolling
        };

        const container = scrollRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current && !isUserScrolling.current) {
            const timeSinceLastScroll = Date.now() - lastScrollTime.current;
            if (timeSinceLastScroll > 2000) { // Only auto-scroll if user hasn't scrolled for 2 seconds
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [messages, isLoading]);

    const validate = (): boolean => {
        const trimmed = input.trim();
        if (!trimmed) {
            setInputError("Message cannot be empty");
            return false;
        }
        if (trimmed.length < 2) {
            setInputError("Message must be at least 2 characters");
            return false;
        }
        if (trimmed.length > 10000) {
            setInputError("Message exceeds 10,000 character limit");
            return false;
        }
        setInputError(null);
        return true;
    };

    const abortControllerRef = useRef<AbortController | null>(null);

    const handleSend = async () => {
        if (!validate()) return;
        const text = input.trim();

        setInput("");
        setInputError(null);

        const timestamp = Date.now();
        const userMsg: Message = { role: "user", content: text, timestamp };

        // Push user msg first and an empty AI msg
        // We use functional updates to prevent stale closures.
        setMessages((prev) => [...prev, userMsg, { role: "ai", content: "", timestamp: timestamp + 1, isStreaming: true }]);
        setIsLoading(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${API_BASE}/generate/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    prompt: text,
                    ...(selectedModel ? { model: selectedModel } : {})
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Generation failed");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No reader available");

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");

                // Keep the last potentially incomplete line in the buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.trim().startsWith("data: ")) {
                        const dataStr = line.replace(/^data:\s*/, "").trim();
                        if (!dataStr || dataStr === "{}") continue;

                        try {
                            const event = JSON.parse(dataStr);

                            if (event.error) {
                                throw new Error(event.error);
                            }

                            if (event.type === "chunk") {
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const lastMsg = newMsgs[newMsgs.length - 1];
                                    if (lastMsg && lastMsg.role === "ai" && lastMsg.isStreaming) {
                                        lastMsg.content += event.chunk;
                                    }
                                    return newMsgs;
                                });
                            } else if (event.type === "complete") {
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const lastMsg = newMsgs[newMsgs.length - 1];
                                    if (lastMsg && lastMsg.role === "ai" && lastMsg.isStreaming) {
                                        lastMsg.isStreaming = false;
                                        lastMsg.model = event.response.model || event.response.provider;
                                        lastMsg.tokens = event.response.usage?.totalTokens;
                                    }
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // Ignored parse error for partial chunks
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "ai" && lastMsg.isStreaming) {
                        lastMsg.isStreaming = false;
                        lastMsg.content += `\n\n**Error:** ${err.message}`;
                    }
                    return newMsgs;
                });
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    return (
        <div className="animate-fade-in flex flex-col h-[calc(100vh-5rem)]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white tracking-tight">Chat</h1>
                <div className="text-sm text-[var(--text-muted)] mt-1 flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                        <span>Interactive AI conversation — real-time generation</span>
                        {models.length > 0 && (
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-xs px-2 py-1 text-white outline-none"
                            >
                                <option value="">Auto-select Best Model</option>
                                {models.map((m: any, idx: number) => {
                                    const id = typeof m === "string" ? m : m.id;
                                    const name = typeof m === "string" ? m : m.name || m.id;
                                    return <option key={idx} value={id}>{name}</option>;
                                })}
                            </select>
                        )}
                    </div>
                    {messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMessages([])}
                            className="text-[var(--text-faint)] hover:text-white h-7 text-xs"
                        >
                            Clear History
                        </Button>
                    )}
                </div>
            </div>

            <Card className="glass-card border-[var(--border)] flex flex-col flex-1 min-h-0">
                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-5" ref={scrollRef}>
                    {messages.length === 0 && !isLoading && (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-purple)]/20 flex items-center justify-center mb-4">
                                <Bot className="w-8 h-8 text-[var(--accent-blue)]" />
                            </div>
                            <p className="text-[var(--text-muted)] text-sm max-w-[300px]">
                                Start a conversation with Monult&apos;s AI engine. Your messages are routed to the best available model.
                            </p>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 animate-slide-up ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {m.role === "ai" && (
                                <div className="w-8 h-8 rounded-lg bg-[var(--accent-purple)]/10 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-4 h-4 text-[var(--accent-purple)]" />
                                </div>
                            )}
                            <div className={`max-w-[75%] ${m.role === "user" ? "order-first" : ""}`}>
                                <div
                                    className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user"
                                        ? "bg-[var(--accent-blue)] text-white rounded-2xl rounded-br-md shadow-lg shadow-[var(--glow-blue)]"
                                        : "bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-2xl rounded-bl-md border border-[var(--border)]"
                                        }`}
                                >
                                    {m.role === "user" ? (
                                        m.content
                                    ) : (
                                        <MarkdownRenderer content={m.content} />
                                    )}
                                    {m.isStreaming && (
                                        <div className="flex gap-1 mt-2">
                                            <div className="w-2 h-2 bg-[var(--accent-purple)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-[var(--accent-purple)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-[var(--accent-purple)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    )}
                                </div>
                                {m.role === "ai" && m.model && (
                                    <div className="flex items-center gap-2 mt-1.5 ml-1">
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-white/10 text-white/70">
                                            {m.model}
                                            {m.tokens !== undefined && ` • ${m.tokens} tokens`}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            {m.role === "user" && (
                                <div className="w-8 h-8 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center shrink-0 mt-1">
                                    <User className="w-4 h-4 text-[var(--accent-blue)]" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && !messages.some(m => m.isStreaming) && (
                        <div className="flex gap-3 animate-slide-up">
                            <div className="w-8 h-8 rounded-lg bg-[var(--accent-purple)]/10 flex items-center justify-center shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-[var(--accent-purple)] animate-pulse-soft" />
                            </div>
                            <div className="space-y-2 pt-2">
                                <Skeleton className="h-4 w-[250px] bg-[var(--bg-elevated)]" />
                                <Skeleton className="h-4 w-[180px] bg-[var(--bg-elevated)]" />
                                <Skeleton className="h-4 w-[120px] bg-[var(--bg-elevated)]" />
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Input Area */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-primary)]/50">
                    {inputError && (
                        <div className="flex items-center gap-2 text-[var(--accent-red)] text-xs mb-2 px-1">
                            <AlertCircle className="w-3 h-3" />
                            {inputError}
                        </div>
                    )}
                    <form
                        className="flex gap-3 items-end"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                    >
                        <Textarea
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                if (inputError) setInputError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Message Monult AI..."
                            className="flex-1 bg-[var(--bg-elevated)] border-[var(--border)] min-h-[44px] max-h-[150px] resize-none focus-visible:ring-[var(--accent-blue)]/50 text-sm"
                            disabled={isLoading}
                            rows={1}
                        />
                        <Button
                            type="submit"
                            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white h-11 px-5 rounded-xl shadow-lg shadow-[var(--glow-blue)] transition-all disabled:opacity-30"
                            disabled={isLoading || !input.trim()}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
