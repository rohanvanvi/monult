/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Base Agent
// ─────────────────────────────────────────────────────────────
// Agent framework for autonomous AI agents that can analyze
// code, read repositories, execute tasks, and call tools.
// ─────────────────────────────────────────────────────────────

import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';
import { BaseTool, ToolResult } from '../tools/base';

export interface AgentConfig {
    name: string;
    description: string;
    model?: string;
    provider?: string;
    systemPrompt?: string;
    tools?: BaseTool[];
    maxIterations?: number;
    verbose?: boolean;
}

export interface AgentTask {
    id: string;
    description: string;
    input: string;
    context?: Record<string, unknown>;
    model?: string;
    onProgress?: (chunk: string) => void;
}

export interface AgentStep {
    iteration: number;
    thought: string;
    action?: string;
    toolName?: string;
    toolInput?: string;
    toolResult?: ToolResult;
    observation?: string;
    timestamp: number;
}

export interface AgentResult {
    taskId: string;
    agentName: string;
    output: string;
    steps: AgentStep[];
    success: boolean;
    totalIterations: number;
    totalLatency: number;
    timestamp: number;
}

/**
 * Base Agent — autonomous AI agent that can reason, use tools,
 * and execute multi-step tasks.
 *
 * Implements a ReAct (Reason + Act) loop.
 */
export abstract class BaseAgent {
    readonly name: string;
    readonly description: string;
    protected sdk: UniversalSDK;
    protected memory: ContextManager;
    protected config: AgentConfig;
    protected tools: Map<string, BaseTool> = new Map();

    constructor(sdk: UniversalSDK, memory: ContextManager, config: AgentConfig) {
        this.name = config.name;
        this.description = config.description;
        this.sdk = sdk;
        this.memory = memory;
        this.config = config;

        if (config.tools) {
            for (const tool of config.tools) {
                this.tools.set(tool.name, tool);
            }
        }
    }

    /**
     * Run the agent on a task.
     */
    async run(task: AgentTask): Promise<AgentResult> {
        const startTime = Date.now();
        const steps: AgentStep[] = [];
        const maxIterations = this.config.maxIterations || 25;

        let currentContext = `Task: ${task.description}\nInput: ${task.input}`;
        let finalOutput = '';

        for (let i = 0; i < maxIterations; i++) {
            const step = await this.think(currentContext, steps, i, task.model, task.onProgress);
            steps.push(step);

            // Check if agent wants to use a tool
            if (step.toolName && this.tools.has(step.toolName)) {
                const tool = this.tools.get(step.toolName)!;
                const toolResult = await tool.execute(step.toolInput || '');
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

    /**
     * Think step — generate thought, action, and observation.
     * Override in subclasses for specialized behavior.
     */
    protected async think(context: string, previousSteps: AgentStep[], iteration: number, modelOverride?: string, onProgress?: (chunk: string) => void): Promise<AgentStep> {
        const toolDescriptions = [...this.tools.values()]
            .map(t => `- ${t.name}: ${t.description}`)
            .join('\n');

        const previousThoughts = previousSteps
            .map(s => `Thought: ${s.thought}${s.toolName ? `\nAction: ${s.toolName}(${s.toolInput})` : ''}${s.observation ? `\nObservation: ${s.observation}` : ''}`)
            .join('\n\n');

        const prompt = `You are the ${this.name} agent. ${this.description}

Available tools:
${toolDescriptions || 'None'}

${previousThoughts ? `Previous steps:\n${previousThoughts}\n\n` : ''}Current context:
${context}

Think step by step. If you need to use a tool, respond with:
Thought: [your reasoning]
Action: [tool_name]
Input: [tool input]

If you have a final answer, respond with:
Thought: [DONE] [your final answer]

Respond now:`;

        const response = await this.sdk.generate({
            provider: this.config.provider,
            model: modelOverride || this.config.model,
            prompt,
            systemPrompt: this.config.systemPrompt || `You are ${this.name}, an AI agent specialized in ${this.description}.`,
            onChunk: onProgress
        } as any);

        return this.parseAgentResponse(response.content, iteration);
    }

    /**
     * Parse the agent's response into a structured step.
     */
    private parseAgentResponse(content: string, iteration: number): AgentStep {
        const step: AgentStep = {
            iteration,
            thought: content,
            timestamp: Date.now(),
        };

        // Extract action
        const actionMatch = content.match(/Action:\s*(\w[\w-]*)/i);
        if (actionMatch) {
            step.toolName = actionMatch[1];
            step.action = actionMatch[1];
        }

        // Extract input
        const inputMatch = content.match(/Input:\s*(.+?)(?:\n|$)/is);
        if (inputMatch) {
            let toolInput = inputMatch[1].trim();
            
            // Parse tool input safely - handle JSON objects
            if (toolInput) {
                try {
                    // Try to parse as JSON if it looks like JSON
                    if (toolInput.trim().startsWith('{') && toolInput.trim().endsWith('}')) {
                        const parsed = JSON.parse(toolInput);
                        // Extract filename from path if available
                        if (parsed.path && typeof parsed.path === 'string') {
                            toolInput = parsed.path;
                        } else if (parsed.filename && typeof parsed.filename === 'string') {
                            toolInput = parsed.filename;
                        } else if (parsed.name && typeof parsed.name === 'string') {
                            toolInput = parsed.name;
                        }
                    }
                } catch (e) {
                    // If not valid JSON, use as-is
                }
            }
            
            step.toolInput = toolInput;
        }

        // Extract thought
        const thoughtMatch = content.match(/Thought:\s*(.+?)(?:\nAction|$)/is);
        if (thoughtMatch) {
            step.thought = thoughtMatch[1].trim();
        }

        // Check for finish
        if (content.includes('[DONE]') || content.toLowerCase().includes('final answer:')) {
            step.action = 'FINISH';
        }

        return step;
    }

    /**
     * Register a tool for this agent.
     */
    registerTool(tool: BaseTool): void {
        this.tools.set(tool.name, tool);
    }

    /**
     * Get agent info.
     */
    info(): { name: string; description: string; tools: string[] } {
        return {
            name: this.name,
            description: this.description,
            tools: [...this.tools.keys()],
        };
    }
}
