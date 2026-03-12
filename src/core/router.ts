/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Smart Model Router
// ─────────────────────────────────────────────────────────────
// Automatically selects the best AI model based on task type,
// latency requirements, cost budget, and accuracy needs.
// ─────────────────────────────────────────────────────────────

import { ModelProfile, ProviderCapabilities } from '../providers/base';
import { UniversalSDK } from './sdk';

export interface RoutingConfig {
    strategy?: 'performance' | 'cost' | 'balanced' | 'quality';
    maxLatency?: number;
    maxCost?: number;
    preferredProviders?: string[];
    taskType?: TaskType;
}

export type TaskType =
    | 'coding'
    | 'reasoning'
    | 'creative'
    | 'analysis'
    | 'summarization'
    | 'translation'
    | 'conversation'
    | 'math'
    | 'research'
    | 'general';

interface TaskProfile {
    type: TaskType;
    keywords: string[];
    preferredTags: string[];
    costSensitivity: number;  // 0-1
    qualityWeight: number;    // 0-1
}

interface RouteDecision {
    model: ModelProfile;
    reason: string;
    score: number;
    alternatives: Array<{ model: ModelProfile; score: number }>;
}

/**
 * Smart Model Router — intelligently selects the optimal model for each request.
 */
export class SmartRouter {
    private sdk: UniversalSDK;
    private taskProfiles: Map<TaskType, TaskProfile>;
    private usageHistory: Array<{ model: string; latency: number; success: boolean; taskType: TaskType }> = [];

    constructor(sdk: UniversalSDK) {
        this.sdk = sdk;
        this.taskProfiles = this.initTaskProfiles();
    }

    /**
     * Route a request to the best model.
     */
    route(prompt: string, config: RoutingConfig = {}): RouteDecision {
        const taskType = config.taskType || this.detectTaskType(prompt);
        const models = this.sdk.listModels();

        if (models.length === 0) {
            throw new Error('No models available for routing');
        }

        const scored = models.map(model => ({
            model,
            score: this.scoreModel(model, taskType, config),
        }));

        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];

        return {
            model: best.model,
            reason: this.explainRouting(best.model, taskType, config),
            score: best.score,
            alternatives: scored.slice(1, 4),
        };
    }

    /**
     * Detect the type of task from the prompt text.
     */
    detectTaskType(prompt: string): TaskType {
        const lower = prompt.toLowerCase();

        for (const [type, profile] of this.taskProfiles) {
            const matches = profile.keywords.filter(kw => lower.includes(kw)).length;
            if (matches >= 2) return type;
        }

        // Fallback heuristics
        if (/\b(code|function|class|implement|debug|fix|bug|error|compile)\b/i.test(prompt)) return 'coding';
        if (/\b(why|how|explain|reason|logic|think|analyze)\b/i.test(prompt)) return 'reasoning';
        if (/\b(write|story|poem|create|imagine|design)\b/i.test(prompt)) return 'creative';
        if (/\b(summarize|summary|brief|tldr|overview)\b/i.test(prompt)) return 'summarization';
        if (/\b(translate|translation|language)\b/i.test(prompt)) return 'translation';
        if (/\b(calculate|math|equation|formula|compute)\b/i.test(prompt)) return 'math';

        return 'general';
    }

    /**
     * Record a completed request for learning.
     */
    recordUsage(model: string, latency: number, success: boolean, taskType: TaskType): void {
        this.usageHistory.push({ model, latency, success, taskType });
        // Keep only last 1000 entries
        if (this.usageHistory.length > 1000) {
            this.usageHistory = this.usageHistory.slice(-1000);
        }
    }

    /**
     * Get routing statistics.
     */
    getStats(): Record<string, { avgLatency: number; successRate: number; count: number }> {
        const stats: Record<string, { totalLatency: number; successes: number; count: number }> = {};

        for (const entry of this.usageHistory) {
            if (!stats[entry.model]) {
                stats[entry.model] = { totalLatency: 0, successes: 0, count: 0 };
            }
            stats[entry.model].totalLatency += entry.latency;
            stats[entry.model].successes += entry.success ? 1 : 0;
            stats[entry.model].count += 1;
        }

        const result: Record<string, { avgLatency: number; successRate: number; count: number }> = {};
        for (const [model, data] of Object.entries(stats)) {
            result[model] = {
                avgLatency: data.count > 0 ? data.totalLatency / data.count : 0,
                successRate: data.count > 0 ? data.successes / data.count : 0,
                count: data.count,
            };
        }
        return result;
    }

    private scoreModel(model: ModelProfile, taskType: TaskType, config: RoutingConfig): number {
        let score = 50;
        const caps = model.capabilities;
        const profile = this.taskProfiles.get(taskType);

        // Tag matching — reward models whose tags match the task's preferred tags
        if (profile) {
            const tagMatches = model.tags.filter(t => profile.preferredTags.includes(t)).length;
            score += tagMatches * 15;
        }

        // Strategy adjustments
        switch (config.strategy) {
            case 'cost':
                score += (1 - Math.min(caps.costPer1kInput * 100, 1)) * 30;
                break;
            case 'quality':
                score += caps.maxContextWindow > 100000 ? 20 : 0;
                score += caps.supportsFunctions ? 10 : 0;
                break;
            case 'performance':
                // Prefer cheaper/faster models
                score += caps.costPer1kInput < 0.001 ? 20 : 0;
                break;
            default: // balanced
                score += (1 - Math.min(caps.costPer1kInput * 50, 1)) * 15;
                score += caps.maxContextWindow > 100000 ? 10 : 0;
        }

        // Provider preference bonus
        if (config.preferredProviders?.includes(model.provider)) {
            score += 20;
        }

        // Cost constraint
        if (config.maxCost && caps.costPer1kInput > config.maxCost) {
            score *= 0.3;
        }

        // Historical performance bonus
        const history = this.usageHistory.filter(h => h.model === model.id);
        if (history.length > 5) {
            const successRate = history.filter(h => h.success).length / history.length;
            score += successRate * 10;
        }

        return score;
    }

    private explainRouting(model: ModelProfile, taskType: TaskType, config: RoutingConfig): string {
        const parts = [`Selected ${model.name} (${model.provider}) for ${taskType} task.`];
        if (config.strategy) parts.push(`Strategy: ${config.strategy}.`);
        parts.push(`Strengths: ${model.capabilities.strengths.slice(0, 3).join(', ')}.`);
        return parts.join(' ');
    }

    private initTaskProfiles(): Map<TaskType, TaskProfile> {
        const profiles = new Map<TaskType, TaskProfile>();

        profiles.set('coding', {
            type: 'coding',
            keywords: ['code', 'function', 'class', 'implement', 'debug', 'algorithm', 'api', 'typescript', 'python', 'javascript', 'bug', 'error'],
            preferredTags: ['coding', 'fast', 'reasoning'],
            costSensitivity: 0.3,
            qualityWeight: 0.9,
        });

        profiles.set('reasoning', {
            type: 'reasoning',
            keywords: ['why', 'explain', 'reason', 'analyze', 'compare', 'evaluate', 'logic', 'think', 'understand'],
            preferredTags: ['reasoning', 'complex-tasks', 'analysis'],
            costSensitivity: 0.2,
            qualityWeight: 1.0,
        });

        profiles.set('creative', {
            type: 'creative',
            keywords: ['write', 'story', 'poem', 'creative', 'imagine', 'design', 'brainstorm', 'idea'],
            preferredTags: ['creative', 'general-purpose'],
            costSensitivity: 0.5,
            qualityWeight: 0.7,
        });

        profiles.set('analysis', {
            type: 'analysis',
            keywords: ['analyze', 'review', 'assess', 'evaluate', 'audit', 'inspect', 'examine'],
            preferredTags: ['analysis', 'reasoning', 'coding'],
            costSensitivity: 0.3,
            qualityWeight: 0.9,
        });

        profiles.set('summarization', {
            type: 'summarization',
            keywords: ['summarize', 'summary', 'brief', 'tldr', 'overview', 'key points', 'condense'],
            preferredTags: ['fast', 'cheap', 'general-purpose'],
            costSensitivity: 0.8,
            qualityWeight: 0.5,
        });

        profiles.set('translation', {
            type: 'translation',
            keywords: ['translate', 'translation', 'language', 'convert', 'localize'],
            preferredTags: ['multimodal', 'general-purpose'],
            costSensitivity: 0.7,
            qualityWeight: 0.6,
        });

        profiles.set('conversation', {
            type: 'conversation',
            keywords: ['chat', 'talk', 'discuss', 'conversation', 'hello', 'help'],
            preferredTags: ['fast', 'cheap', 'general-purpose'],
            costSensitivity: 0.9,
            qualityWeight: 0.4,
        });

        profiles.set('math', {
            type: 'math',
            keywords: ['calculate', 'math', 'equation', 'formula', 'compute', 'solve', 'integral', 'derivative'],
            preferredTags: ['reasoning', 'complex-tasks'],
            costSensitivity: 0.2,
            qualityWeight: 1.0,
        });

        profiles.set('research', {
            type: 'research',
            keywords: ['research', 'find', 'search', 'investigate', 'explore', 'discover', 'study'],
            preferredTags: ['long-context', 'reasoning', 'analysis'],
            costSensitivity: 0.3,
            qualityWeight: 0.9,
        });

        profiles.set('general', {
            type: 'general',
            keywords: [],
            preferredTags: ['general-purpose'],
            costSensitivity: 0.5,
            qualityWeight: 0.5,
        });

        return profiles;
    }
}
