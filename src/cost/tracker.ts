/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Cost Optimization Engine
// ─────────────────────────────────────────────────────────────
// Tracks token usage, cost per request, and enables
// automatic model selection for cost optimization.
// ─────────────────────────────────────────────────────────────

import { GenerateResponse, TokenUsage } from '../providers/base';

export interface CostEntry {
    id: string;
    provider: string;
    model: string;
    usage: TokenUsage;
    cost: number;
    latency: number;
    timestamp: number;
}

export interface CostSummary {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    byProvider: Record<string, { cost: number; tokens: number; requests: number; avgLatency: number }>;
    byModel: Record<string, { cost: number; tokens: number; requests: number; avgLatency: number }>;
    period: { start: number; end: number };
}

interface ProviderPricing {
    costPer1kInput: number;
    costPer1kOutput: number;
}

/**
 * Cost Tracker — monitors and optimizes AI spending.
 */
export class CostTracker {
    private entries: CostEntry[] = [];
    private pricing: Map<string, ProviderPricing> = new Map();

    constructor() {
        this.initDefaultPricing();
    }

    /**
     * Track a completed request.
     */
    track(response: GenerateResponse): CostEntry {
        const cost = this.calculateCost(response.provider, response.model, response.usage);

        const entry: CostEntry = {
            id: response.id,
            provider: response.provider,
            model: response.model,
            usage: response.usage,
            cost,
            latency: response.latency,
            timestamp: response.timestamp || Date.now(),
        };

        this.entries.push(entry);
        return entry;
    }

    /**
     * Get cost summary for a time period.
     */
    getSummary(startTime?: number, endTime?: number): CostSummary {
        const start = startTime || 0;
        const end = endTime || Date.now();
        const filtered = this.entries.filter(e => e.timestamp >= start && e.timestamp <= end);

        const byProvider: CostSummary['byProvider'] = {};
        const byModel: CostSummary['byModel'] = {};
        let totalCost = 0;
        let totalTokens = 0;

        for (const entry of filtered) {
            totalCost += entry.cost;
            totalTokens += entry.usage.totalTokens;

            // By provider
            if (!byProvider[entry.provider]) {
                byProvider[entry.provider] = { cost: 0, tokens: 0, requests: 0, avgLatency: 0 };
            }
            byProvider[entry.provider].cost += entry.cost;
            byProvider[entry.provider].tokens += entry.usage.totalTokens;
            byProvider[entry.provider].requests += 1;
            byProvider[entry.provider].avgLatency =
                (byProvider[entry.provider].avgLatency * (byProvider[entry.provider].requests - 1) + entry.latency) /
                byProvider[entry.provider].requests;

            // By model
            if (!byModel[entry.model]) {
                byModel[entry.model] = { cost: 0, tokens: 0, requests: 0, avgLatency: 0 };
            }
            byModel[entry.model].cost += entry.cost;
            byModel[entry.model].tokens += entry.usage.totalTokens;
            byModel[entry.model].requests += 1;
            byModel[entry.model].avgLatency =
                (byModel[entry.model].avgLatency * (byModel[entry.model].requests - 1) + entry.latency) /
                byModel[entry.model].requests;
        }

        return {
            totalCost,
            totalTokens,
            totalRequests: filtered.length,
            byProvider,
            byModel,
            period: { start, end },
        };
    }

    /**
     * Estimate cost for a given token count and model.
     */
    estimateCost(tokens: number, model: string): number {
        const pricing = this.pricing.get(model) || this.pricing.get('claude-3-sonnet-20240229') || { costPer1kInput: 0.003, costPer1kOutput: 0.015 };
        // Assume 50% input, 50% output for estimation
        return (tokens / 2000) * (pricing.costPer1kInput + pricing.costPer1kOutput);
    }

    /**
     * Get a formatted cost report.
     */
    getReport(): string {
        const summary = this.getSummary();
        const lines = [
            '💰 Monult Cost Report',
            `   Total Cost: $${summary.totalCost.toFixed(4)}`,
            `   Total Tokens: ${summary.totalTokens.toLocaleString()}`,
            `   Total Requests: ${summary.totalRequests}`,
            '',
            '── By Provider ──',
        ];

        for (const [provider, data] of Object.entries(summary.byProvider)) {
            lines.push(
                `   ${provider}: $${data.cost.toFixed(4)} | ${data.tokens.toLocaleString()} tokens | ${data.requests} requests | avg ${data.avgLatency.toFixed(0)}ms`
            );
        }

        lines.push('', '── By Model ──');
        for (const [model, data] of Object.entries(summary.byModel)) {
            lines.push(
                `   ${model}: $${data.cost.toFixed(4)} | ${data.tokens.toLocaleString()} tokens | ${data.requests} requests`
            );
        }

        return lines.join('\n');
    }

    /**
     * Set custom pricing for a model.
     */
    setPricing(model: string, pricing: ProviderPricing): void {
        this.pricing.set(model, pricing);
    }

    /**
     * Get all tracked entries.
     */
    getEntries(limit?: number): CostEntry[] {
        return limit ? this.entries.slice(-limit) : [...this.entries];
    }

    private calculateCost(provider: string, model: string, usage: TokenUsage): number {
        const pricing = this.pricing.get(model) || this.pricing.get(provider) || { costPer1kInput: 0.01, costPer1kOutput: 0.03 };
        return (usage.promptTokens / 1000) * pricing.costPer1kInput +
            (usage.completionTokens / 1000) * pricing.costPer1kOutput;
    }

    private initDefaultPricing(): void {
        // Claude
        this.pricing.set('claude-3-5-sonnet-20241022', { costPer1kInput: 0.003, costPer1kOutput: 0.015 });
        this.pricing.set('claude-3-opus-20240229', { costPer1kInput: 0.015, costPer1kOutput: 0.075 });
        this.pricing.set('claude-3-haiku-20240307', { costPer1kInput: 0.00025, costPer1kOutput: 0.00125 });
        // OpenAI
        this.pricing.set('gpt-4-turbo', { costPer1kInput: 0.01, costPer1kOutput: 0.03 });
        this.pricing.set('gpt-4o', { costPer1kInput: 0.005, costPer1kOutput: 0.015 });
        this.pricing.set('gpt-3.5-turbo', { costPer1kInput: 0.0005, costPer1kOutput: 0.0015 });
        // Gemini
        this.pricing.set('gemini-1.5-pro', { costPer1kInput: 0.00125, costPer1kOutput: 0.005 });
        this.pricing.set('gemini-1.5-flash', { costPer1kInput: 0.000075, costPer1kOutput: 0.0003 });
        // Cohere
        this.pricing.set('command-r-plus', { costPer1kInput: 0.003, costPer1kOutput: 0.015 });
        this.pricing.set('command-r', { costPer1kInput: 0.0005, costPer1kOutput: 0.0015 });
        this.pricing.set('command', { costPer1kInput: 0.001, costPer1kOutput: 0.002 });
        this.pricing.set('command-light', { costPer1kInput: 0.0003, costPer1kOutput: 0.0006 });
        // Local
        this.pricing.set('local', { costPer1kInput: 0, costPer1kOutput: 0 });
    }
}
