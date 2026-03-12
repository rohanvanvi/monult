/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Documentation Agent
// ─────────────────────────────────────────────────────────────

import { BaseAgent, AgentTask, AgentResult, AgentStep } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';

export class DocsAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'docs',
            description: 'Generates documentation, README files, API references, code comments, and technical guides.',
            systemPrompt: `You are an expert technical writer. When documenting code or systems:
1. Write clear, concise documentation
2. Include code examples and use cases
3. Follow documentation best practices (JSDoc, docstrings)
4. Create structured API references
5. Write developer-friendly guides with step-by-step instructions
Documentation should be accurate, complete, and well-organized.`,
        });
    }

    /**
     * Execute the docs agent task.
     */
    async execute(task: AgentTask): Promise<AgentResult> {
        const startTime = Date.now();
        const steps: AgentStep[] = [];
        const maxIterations = this.config.maxIterations || 10;

        let currentContext = `Task: ${task.description}\nInput: ${task.input}`;
        let finalOutput = '';

        for (let i = 0; i < maxIterations; i++) {
            const step = await this.think(currentContext, steps, i, task.model, task.onProgress);
            steps.push(step);

            // Check if agent wants to use a tool
            if (step.toolName && this.tools.has(step.toolName)) {
                const tool = this.tools.get(step.toolName)!;
                
                // Parse tool input safely
                let toolInput = step.toolInput || '';
                if (toolInput) {
                    try {
                        // Try to parse as JSON if it looks like JSON
                        if (toolInput.trim().startsWith('{') && toolInput.trim().endsWith('}')) {
                            const parsed = JSON.parse(toolInput);
                            // Extract filename from path if available
                            if (parsed.path && typeof parsed.path === 'string') {
                                toolInput = parsed.path;
                            }
                        }
                    } catch (e) {
                        // If not valid JSON, use as-is
                    }
                }

                const toolResult = await tool.execute(toolInput);
                step.toolResult = toolResult;
                step.observation = toolResult.output;
                currentContext += `\n\nTool ${step.toolName} result: ${toolResult.output}`;
                
                // Continue to next iteration to allow for multiple tool calls
                continue;
            }

            // Check if agent is done
            if (step.action === 'FINISH' || step.thought.includes('[DONE]')) {
                finalOutput = step.observation || step.thought.replace('[DONE]', '').trim();
                break;
            }

            if (i === maxIterations - 1) {
                finalOutput = `Agent reached max iterations (${maxIterations}). Last thought: ${step.thought}`;
            }
        }

        // Store results in memory
        this.memory.storeToolResult(this.name, task.input, finalOutput);

        return {
            taskId: task.id,
            agentName: this.name,
            output: finalOutput,
            steps,
            success: finalOutput.length > 0 && !finalOutput.startsWith('Agent reached max'),
            totalIterations: steps.length,
            totalLatency: Date.now() - startTime,
            timestamp: Date.now(),
        };
    }
}
