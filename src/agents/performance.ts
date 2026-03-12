/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Agent — Performance
// ─────────────────────────────────────────────────────────────

import { BaseAgent, AgentStep } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';

export class PerformanceAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'performance',
            description: 'Expert Systems Engineer specializing in optimization, caching, and low-latency architectures.',
            systemPrompt: 'You are a Senior Performance Engineer. You specialize in identifying bottlenecks, memory leaks, algorithmic inefficiencies, and optimizing systems for heavy loads. Provide detailed recommendations for caching, CDN usage, and database indexing.',
        });
    }

    protected async think(context: string, previousSteps: AgentStep[], iteration: number): Promise<AgentStep> {
        if (iteration === 0) {
            const response = await this.sdk.generate({
                provider: this.config.provider,
                prompt: `Analyze this system requirement and provide comprehensive performance and scaling optimizations:\n\n${context}\n\nProvide:\n1. Bottleneck identification\n2. Caching strategy (Redis/Memcached)\n3. Database indexing and query optimization\n4. Load balancing and CDN usage\n5. Memory management\n\nPrefix your final answer with [DONE].`,
                systemPrompt: this.config.systemPrompt,
            });

            return {
                iteration,
                thought: `[DONE] ${response.content}`,
                action: 'FINISH',
                observation: response.content,
                timestamp: Date.now(),
            };
        }

        return super.think(context, previousSteps, iteration);
    }
}
