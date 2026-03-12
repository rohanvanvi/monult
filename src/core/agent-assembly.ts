/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Agent Assembly Engine
// ─────────────────────────────────────────────────────────────
// Orchestrates multi-agent collaboration where multiple
// specialized agents propose, critique, improve, and reach
// consensus on a task.
// ─────────────────────────────────────────────────────────────

import { AgentRegistry } from '../agents/registry';
import { BaseAgent, AgentResult } from '../agents/base';
import { ConsensusEngine, ConsensusResult } from './consensus';
import { UniversalSDK } from './sdk';
import { GenerateResponse } from '../providers/base';

export interface AgentAssemblyConfig {
    agents: string[];
    task: string;
    rounds?: number;
    enableCritique?: boolean;
    enableImprovement?: boolean;
    leaderSelection?: boolean;
    context?: Record<string, unknown>;
    onProgress?: (event: {
        type: 'stage_start' | 'stage_chunk' | 'stage_complete' | 'consensus_complete';
        stage?: string;
        agent?: string;
        role?: 'proposer' | 'critic' | 'improver' | 'consensus-engine';
        chunk?: string;
        data?: any;
    }) => void;
}

export interface AgentAssemblyStage {
    phase: 'propose' | 'critique' | 'improve' | 'consensus';
    agentName: string;
    output: string;
    latency: number;
    timestamp: number;
}

export interface AgentAssemblyResult {
    id: string;
    task: string;
    consensus: string;
    confidence: number;
    reasoning: string;
    stages: AgentAssemblyStage[];
    agentResults: AgentResult[];
    totalLatency: number;
    totalAgents: number;
    timestamp: number;
}

/**
 * Agent Assembly Engine — coordinates multi-agent collaboration.
 *
 * Workflow:
 * 1. Each agent proposes a solution independently.
 * 2. Agents critique each other's proposals.
 * 3. Agents improve solutions based on critiques.
 * 4. Consensus engine selects the final answer.
 *
 * @example
 * ```ts
 * const result = await agentAssembly.run({
 *   agents: ['architect', 'security', 'devops'],
 *   task: 'Design a scalable backend architecture',
 * });
 * ```
 */
export class AgentAssemblyEngine {
    private registry: AgentRegistry;
    private consensusEngine: ConsensusEngine;
    private sdk: UniversalSDK;

    constructor(registry: AgentRegistry, sdk?: UniversalSDK) {
        this.registry = registry;
        this.sdk = sdk || new UniversalSDK();
        this.consensusEngine = new ConsensusEngine();
    }

    /**
     * Run a multi-agent assembly.
     */
    async run(config: AgentAssemblyConfig): Promise<AgentAssemblyResult> {
        const startTime = Date.now();
        const assemblyId = `agent-asm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const stages: AgentAssemblyStage[] = [];
        const agentResults: AgentResult[] = [];

        // Resolve initial agents
        let agents = this.resolveAgents(config.agents);
        if (agents.length === 0 && !config.leaderSelection) {
            throw new Error(`No valid agents found. Requested: ${config.agents.join(', ')}. Available: ${this.registry.list().map(a => a.name).join(', ')}`);
        }

        // ── Phase 0: Leader Selection (optional) ─────────────────
        if (config.leaderSelection) {
            config.onProgress?.({ type: 'stage_start', stage: 'Leader Review', agent: 'Leader', role: 'leader' as any });

            const registryList = this.registry.list().map(a => `${a.name}: ${a.description}`).join('\n');
            const leaderPrompt = `You are the Leader Agent orchestrating a complex task.
Your job is to read the user's task and select the 2 to 3 most appropriate specialist agents to handle it.

Available Agents:
${registryList}

Task: "${config.task}"

First, briefly explain your thought process. 
Then, on a new line, write exactly the names of the selected agents separated by commas (e.g., "architect, security").`;

            const requestTime = Date.now();

            // We stream the leader's thoughts to the UI
            let leaderOutput = '';
            const leaderResult = await this.sdk.generate({
                prompt: "You are an expert orchestrator agent.\n" + leaderPrompt,
                stream: true,
                onChunk: (chunk: string) => {
                    leaderOutput += chunk;
                    config.onProgress?.({ type: 'stage_chunk', chunk });
                }
            });

            stages.push({
                phase: 'propose', // Stored under propose for visual simplicity, role clearly differentiates it
                agentName: 'Leader',
                output: leaderResult.content,
                latency: Date.now() - requestTime,
                timestamp: Date.now(),
            });

            config.onProgress?.({ type: 'stage_complete', stage: 'Leader Review', data: { output: leaderResult.content, agentName: 'Leader' } });

            // Parse agent names from the end of the text
            const lastLine = leaderResult.content.split('\n').pop() || '';
            const extractedNames = lastLine.split(',').map((s: string) => s.trim().toLowerCase());

            // Re-resolve agents based on what the leader picked
            agents = this.resolveAgents(extractedNames.filter((n: string) => this.registry.has(n)));

            // Fallback if leader failed to pick valid agents
            if (agents.length === 0) {
                agents = this.resolveAgents(config.agents);
            }
        }

        if (agents.length === 0) {
            throw new Error(`No valid agents found after Leader Selection. Available: ${this.registry.list().map(a => a.name).join(', ')}`);
        }

        // ── Phase 1: Propose ──────────────────────────────────
        const proposals: AgentResult[] = [];

        // Run proposals sequentially so SSE cleanly streams each agent
        for (const agent of agents) {
            config.onProgress?.({ type: 'stage_start', stage: 'Propose', agent: agent.name, role: 'proposer' });

            const result = await agent.run({
                id: `${assemblyId}-propose-${agent.name}`,
                description: `Propose a solution: ${config.task}`,
                input: config.task,
                context: config.context,
                onProgress: (chunk) => config.onProgress?.({ type: 'stage_chunk', chunk, agent: agent.name })
            });

            proposals.push(result);
            agentResults.push(result);
            stages.push({
                phase: 'propose',
                agentName: result.agentName,
                output: result.output.slice(0, 500),
                latency: result.totalLatency,
                timestamp: result.timestamp,
            });

            config.onProgress?.({ type: 'stage_complete', stage: 'Propose', data: result });
        }

        // ── Phase 2: Critique (optional) ──────────────────────
        const critiques: AgentResult[] = [];
        if (config.enableCritique !== false && agents.length > 1) {
            for (let i = 0; i < agents.length; i++) {
                const agent = agents[i];
                // Each agent critiques the other proposals
                const otherProposals = proposals
                    .filter(p => p.agentName !== agent.name)
                    .map(p => `[${p.agentName}]: ${p.output}`)
                    .join('\n\n---\n\n');

                config.onProgress?.({ type: 'stage_start', stage: 'Critique', agent: agent.name, role: 'critic' });

                const critiqueResult = await agent.run({
                    id: `${assemblyId}-critique-${agent.name}`,
                    description: `Critique these proposals for: ${config.task}`,
                    input: `Review and critique the following proposals. Identify strengths, weaknesses, and gaps.\n\nTask: ${config.task}\n\nProposals:\n${otherProposals}`,
                    context: config.context,
                    onProgress: (chunk) => config.onProgress?.({ type: 'stage_chunk', chunk, agent: agent.name })
                });

                critiques.push(critiqueResult);
                agentResults.push(critiqueResult);
                stages.push({
                    phase: 'critique',
                    agentName: critiqueResult.agentName,
                    output: critiqueResult.output.slice(0, 500),
                    latency: critiqueResult.totalLatency,
                    timestamp: critiqueResult.timestamp,
                });
                config.onProgress?.({ type: 'stage_complete', stage: 'Critique', data: critiqueResult });
            }
        }

        // ── Phase 3: Improve (optional) ───────────────────────
        const improvements: AgentResult[] = [];
        if (config.enableImprovement !== false && critiques.length > 0) {
            const critiqueSummary = critiques
                .map(c => `[${c.agentName} critique]: ${c.output}`)
                .join('\n\n---\n\n');

            for (let i = 0; i < agents.length; i++) {
                const agent = agents[i];
                config.onProgress?.({ type: 'stage_start', stage: 'Improve', agent: agent.name, role: 'improver' });

                const improveResult = await agent.run({
                    id: `${assemblyId}-improve-${agent.name}`,
                    description: `Improve your proposal based on critiques for: ${config.task}`,
                    input: `Improve your original proposal based on all the critiques received.\n\nTask: ${config.task}\n\nYour original proposal:\n${proposals[i].output}\n\nCritiques:\n${critiqueSummary}\n\nProvide an improved solution addressing all valid feedback.`,
                    context: config.context,
                    onProgress: (chunk) => config.onProgress?.({ type: 'stage_chunk', chunk })
                });

                improvements.push(improveResult);
                agentResults.push(improveResult);
                stages.push({
                    phase: 'improve',
                    agentName: improveResult.agentName,
                    output: improveResult.output.slice(0, 500),
                    latency: improveResult.totalLatency,
                    timestamp: improveResult.timestamp,
                });
                config.onProgress?.({ type: 'stage_complete', stage: 'Improve', data: improveResult });
            }
        }

        // ── Phase 4: Consensus ────────────────────────────────
        const finalOutputs = (improvements.length > 0 ? improvements : proposals);
        const pseudoResponses = this.convertToResponses(finalOutputs);

        config.onProgress?.({ type: 'stage_start', stage: 'Consensus', agent: 'Consensus Engine', role: 'consensus-engine' });
        const consensusResult = this.consensusEngine.evaluate(pseudoResponses);
        config.onProgress?.({ type: 'stage_complete', stage: 'Consensus', agent: 'Consensus Engine', role: 'consensus-engine', data: { output: 'Consensus evaluation complete.' } });

        config.onProgress?.({ type: 'consensus_complete', data: consensusResult });

        stages.push({
            phase: 'consensus',
            agentName: 'consensus-engine',
            output: `Winner: ${consensusResult.winner.provider} | Confidence: ${(consensusResult.confidence * 100).toFixed(0)}%`,
            latency: 0,
            timestamp: Date.now(),
        });

        return {
            id: assemblyId,
            task: config.task,
            consensus: consensusResult.winner.content,
            confidence: consensusResult.confidence,
            reasoning: consensusResult.reasoning,
            stages,
            agentResults,
            totalLatency: Date.now() - startTime,
            totalAgents: agents.length,
            timestamp: Date.now(),
        };
    }

    private resolveAgents(names: string[]): BaseAgent[] {
        const agents: BaseAgent[] = [];
        for (const name of names) {
            const agent = this.registry.get(name);
            if (agent) agents.push(agent);
        }
        return agents;
    }

    /**
     * Convert AgentResults into pseudo GenerateResponses for the consensus engine.
     */
    private convertToResponses(results: AgentResult[]): GenerateResponse[] {
        return results.map(result => ({
            id: result.taskId,
            content: result.output,
            model: result.agentName,
            provider: `agent:${result.agentName}`,
            usage: { promptTokens: 0, completionTokens: result.output.length, totalTokens: result.output.length },
            latency: result.totalLatency,
            finishReason: result.success ? 'stop' as const : 'error' as const,
            timestamp: result.timestamp,
        }));
    }
}
