/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Model Benchmarker
// ─────────────────────────────────────────────────────────────

import { UniversalSDK } from './sdk';
import { TokenUsage } from '../providers/base';

export interface BenchmarkResult {
    model: string;
    latencyMs: number;
    tokens: TokenUsage;
    contentLength: number;
    outputSample: string;
}

export class ModelBenchmarker {
    constructor(private sdk: UniversalSDK) { }

    /**
     * Run a prompt across all active providers to benchmark performance.
     */
    async runBenchmark(prompt: string): Promise<BenchmarkResult[]> {
        const providerNames = this.sdk.listProviders();
        console.log(`\n⏳ Benchmarking across ${providerNames.length} AI providers...\n`);

        const promises = providerNames.map(async (name) => {
            const providerInstance = this.sdk.getProvider(name);
            const startTime = Date.now();

            if (!providerInstance) {
                return {
                    model: name,
                    latencyMs: 0,
                    tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    contentLength: 0,
                    outputSample: `Error: Provider inactive.`
                };
            }

            try {
                const response = await providerInstance.generate({
                    prompt,
                    model: name.includes('openai') ? 'gpt-4o-mini' :
                        name.includes('claude') ? 'claude-3-haiku-20240307' :
                            name.includes('gemini') ? 'gemini-1.5-flash' : 'command-r'
                });

                const latencyMs = Date.now() - startTime;

                return {
                    model: name,
                    latencyMs,
                    tokens: response.usage,
                    contentLength: response.content.length,
                    outputSample: response.content.substring(0, 100).replace(/\n/g, ' ') + '...'
                };
            } catch (error) {
                return {
                    model: name,
                    latencyMs: Date.now() - startTime,
                    tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    contentLength: 0,
                    outputSample: `Error: ${error instanceof Error ? error.message : error}`
                };
            }
        });

        return Promise.all(promises);
    }
}
