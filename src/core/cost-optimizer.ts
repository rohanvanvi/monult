/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Cost Optimizer
// ─────────────────────────────────────────────────────────────
// Intelligently routes queries based on estimated tokens,
// cost constraints, and required reasoning power.
// ─────────────────────────────────────────────────────────────

import { UniversalSDK } from './sdk';

export interface RouteOptimizationOptions {
    optimizeCost?: boolean;
    maxLatencyMs?: number;
    maxCost?: number; // In cents
}

export interface OptimizationResult {
    selectedModel: string;
    estimatedTokens: number;
    estimatedCost: number; // In cents
    reason: string;
}

export class CostOptimizer {
    constructor(private sdk: UniversalSDK) { }

    /**
     * Estimates tokens simply (roughly 4 chars per token).
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Estimates cost based on a known cost table.
     */
    private estimateCost(modelId: string, tokens: number): number {
        // Mock cost per 1M tokens (input + output blended avg)
        const pricingMap: Record<string, number> = {
            'gpt-4': 30, // $30/1M
            'gpt-4-turbo': 10,
            'gpt-3.5-turbo': 1.5,
            'claude-3-opus': 15,
            'claude-3-sonnet': 3,
            'claude-3-haiku': 0.25,
            'gemini-1.5-pro': 7,
            'gemini-1.5-flash': 0.35,
            'command-r-plus': 3,
            'command-r': 0.5,
        };

        // Match prefix if exact not found
        const pricePerMillion = Object.entries(pricingMap).find(([key]) => modelId.includes(key))?.[1] || 5;

        // Return cost in cents
        return (tokens / 1_000_000) * pricePerMillion * 100;
    }

    /**
     * Determines model capability required based on prompt semantics.
     */
    private analyzeComplexity(prompt: string): 'low' | 'medium' | 'high' {
        const text = prompt.toLowerCase();

        const complexKeywords = ['architecture', 'system design', 'complex', 'microservices', 'concurrency', 'security', 'encryption', 'algorithm'];
        if (text.length > 2000 || complexKeywords.some(kw => text.includes(kw))) {
            return 'high';
        }

        const mediumKeywords = ['refactor', 'function', 'class', 'api', 'database', 'query', 'explain'];
        if (text.length > 500 || mediumKeywords.some(kw => text.includes(kw))) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Select the best model given the prompt and constraints.
     */
    optimizeRoute(prompt: string, options: RouteOptimizationOptions = {}): OptimizationResult {
        const estimatedTokens = this.estimateTokens(prompt) + 500; // Expected output
        const complexity = this.analyzeComplexity(prompt);

        let selectedModel = 'auto';
        let reason = '';

        const availableModels = this.sdk.listProviders();

        // Simple heuristic table mapping capability requirement to preferred, cheaper models
        const tiers: Record<'high' | 'medium' | 'low', string[]> = {
            high: ['claude-3-opus', 'gpt-4-turbo', 'gemini-1.5-pro', 'command-r-plus'],
            medium: ['claude-3-sonnet', 'gpt-3.5-turbo', 'command-r', 'gemini-1.5-flash'],
            low: ['claude-3-haiku', 'gemini-1.5-flash', 'command-r', 'gpt-3.5-turbo']
        };

        if (options.optimizeCost) {
            // Find the cheapest active model that meets the complexity threshold
            const targetTier = tiers[complexity];
            const matchingModels = targetTier.filter(m => availableModels.some(am => am.includes(m.split('-')[0])));

            if (matchingModels.length > 0) {
                // Try to map abstract tier model name to actual registered provider/model combo
                const actualName = matchingModels[0];
                const providerPrefix = actualName.includes('claude') ? 'claude' : actualName.includes('gpt') ? 'openai' : actualName.includes('gemini') ? 'gemini' : 'cohere';
                selectedModel = `${providerPrefix}:${actualName}`;
                reason = `Complexity is ${complexity}, optimized cost routing selected ${selectedModel}.`;
            } else {
                selectedModel = 'auto'; // Fallback
                reason = 'No tier-matched models active. Falling back to default router.';
            }
        } else {
            selectedModel = 'auto';
            reason = 'Cost optimization disabled. Using default router.';
        }

        const estimatedCost = this.estimateCost(selectedModel, estimatedTokens);

        return {
            selectedModel,
            estimatedTokens,
            estimatedCost,
            reason
        };
    }
}
