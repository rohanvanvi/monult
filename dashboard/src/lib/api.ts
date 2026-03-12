1 /*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

export const API_BASE = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3000/api`
    : "http://localhost:3000/api";

async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
    }
    return res.json();
}

export const api = {
    // ── Health & Status ──
    getHealth: () => request("/health"),
    getDocs: () => request("/docs"),

    // ── Cost Analytics ──
    getCost: () => request("/cost"),
    getCostReport: () => request("/cost/report"),

    // ── Models & Providers ──
    getModels: () => request("/models"),
    getProviders: () => request("/providers"),

    // ── Agents ──
    getAgents: () => request("/agents"),
    runAgent: (name: string, input: string, description?: string) =>
        request(`/agents/${name}/run`, {
            method: "POST",
            body: JSON.stringify({ input, description }),
        }),

    // ── Generation ──
    generate: (prompt: string, opts?: { model?: string; provider?: string; systemPrompt?: string; maxTokens?: number; temperature?: number }) =>
        request("/generate", {
            method: "POST",
            body: JSON.stringify({ prompt, ...opts }),
        }),

    // ── Routing ──
    route: (prompt: string, opts?: { strategy?: string; maxCost?: number; taskType?: string }) =>
        request("/route", {
            method: "POST",
            body: JSON.stringify({ prompt, ...opts }),
        }),

    // ── Assembly ──
    assembly: (prompt: string, models?: string[], rounds?: number) =>
        request("/assembly", {
            method: "POST",
            body: JSON.stringify({ prompt, models, debate: true, verify: true, rounds }),
        }),

    // ── Agent Assembly ──
    agentAssembly: (task: string, agents?: string[]) =>
        request("/agent-assembly", {
            method: "POST",
            body: JSON.stringify({ task, agents }),
        }),

    // ── Debate ──
    debate: (topic: string, rounds?: number) =>
        request("/debate", {
            method: "POST",
            body: JSON.stringify({ topic, rounds }),
        }),

    // ── Intent ──
    detectIntent: (text: string) =>
        request("/intent", {
            method: "POST",
            body: JSON.stringify({ text }),
        }),

    // ── Security ──
    securityScan: (text: string, type: "prompt" | "code" = "prompt") =>
        request("/security/scan", {
            method: "POST",
            body: JSON.stringify({ text, type }),
        }),

    // ── Memory ──
    getMemoryStats: () => request("/memory/stats"),
    recallMemory: (query: string, layer?: string, topK?: number) =>
        request("/memory/recall", {
            method: "POST",
            body: JSON.stringify({ query, layer, topK }),
        }),
    storeMemory: (layer: string, key: string, value: string, metadata?: Record<string, unknown>) =>
        request("/memory/store", {
            method: "POST",
            body: JSON.stringify({ layer, key, value, metadata }),
        }),

    // ── Hybrid Assembly ──
    hybridAssembly: (prompt: string, opts?: { models?: string[]; agents?: string[]; systemPrompt?: string }) =>
        request("/hybrid-assembly", {
            method: "POST",
            body: JSON.stringify({ prompt, ...opts }),
        }),
};
