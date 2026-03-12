/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Debugger Agent
// ─────────────────────────────────────────────────────────────

import { BaseAgent } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';
import { AgentStep } from './base';

export class DebuggerAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'debugger',
            description: 'Analyzes code for bugs, errors, and issues. Provides detailed fix suggestions with root cause analysis.',
            systemPrompt: `You are an expert debugging agent. When given code or error descriptions:
1. Identify the root cause of the issue
2. Explain why the bug occurs
3. Provide a specific fix with code
4. Suggest preventive measures
Always be thorough and precise in your analysis.`,
        });
    }

    protected async think(context: string, previousSteps: AgentStep[], iteration: number): Promise<AgentStep> {
        if (iteration === 0) {
            const response = await this.sdk.generate({
                provider: this.config.provider,
                prompt: `Analyze the following for bugs and issues:\n\n${context}\n\nProvide:\n1. Root cause analysis\n2. Step-by-step fix\n3. Prevention recommendations\n\nIf you have the final answer, prefix with [DONE].`,
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
