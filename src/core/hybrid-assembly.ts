/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Hybrid Assembly Engine
// ─────────────────────────────────────────────────────────────
// Combines AI models and AI agents in a single collaboration
// pipeline: model reasoning → agent critique → model
// improvement → consensus.
// ─────────────────────────────────────────────────────────────

import { UniversalSDK } from './sdk';
import { AgentRegistry } from '../agents/registry';
import { BaseAgent, AgentResult } from '../agents/base';
import { ConsensusEngine } from './consensus';
import { GenerateResponse } from '../providers/base';

export interface HybridAssemblyConfig {
    models: string[];
    agents: string[];
    prompt: string;
    systemPrompt?: string;
    rounds?: number;
    enableDebate?: boolean;
    context?: Record<string, unknown>;
}

export interface HybridStage {
    phase: 'model-reasoning' | 'agent-critique' | 'model-improvement' | 'agent-improvement' | 'consensus';
    source: string;                     // model or agent name
    sourceType: 'model' | 'agent';
    output: string;
    latency: number;
    tokens?: number;
    timestamp: number;
}

export interface HybridAssemblyResult {
    id: string;
    prompt: string;
    consensus: string;
    confidence: number;
    reasoning: string;
    stages: HybridStage[];
    totalLatency: number;
    totalTokens: number;
    totalModels: number;
    totalAgents: number;
    timestamp: number;
}

/**
 * Hybrid Assembly Engine — models and agents collaborating together.
 *
 * Pipeline:
 * 1. AI models generate initial proposals
 * 2. AI agents critique/review the proposals
 * 3. AI models improve based on agent feedback
 * 4. Consensus engine selects final answer
 *
 * @example
 * ```ts
 * const result = await hybridAssembly.run({
 *   models: ['claude', 'openai', 'cohere'],
 *   agents: ['architect', 'security'],
 *   prompt: 'Design a secure authentication system',
 * });
 * ```
 */
export class HybridAssemblyEngine {
    private sdk: UniversalSDK;
    private registry: AgentRegistry;
    private consensusEngine: ConsensusEngine;

    constructor(sdk: UniversalSDK, registry: AgentRegistry) {
        this.sdk = sdk;
        this.registry = registry;
        this.consensusEngine = new ConsensusEngine();
    }

    /**
     * Run a hybrid assembly with both models and agents.
     */
    async run(config: HybridAssemblyConfig): Promise<HybridAssemblyResult> {
        const startTime = Date.now();
        const assemblyId = `hybrid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const stages: HybridStage[] = [];
        let totalTokens = 0;

        const models = config.models;
        const agents = this.resolveAgents(config.agents);

        if (models.length === 0 && agents.length === 0) {
            throw new Error('Hybrid assembly requires at least one model or agent');
        }

        // ── Phase 1: Model Reasoning ──────────────────────────
        const modelProposals: GenerateResponse[] = [];
        if (models.length > 0) {
            const proposalPromises = models.map(model =>
                this.sdk.generate({
                    model: model,
                    prompt: config.prompt,
                    systemPrompt: config.systemPrompt || 'You are participating in a collaborative AI assembly. Provide a thorough, well-structured response.',
                })
            );
            const results = await Promise.all(proposalPromises);

            for (const result of results) {
                modelProposals.push(result);
                totalTokens += result.usage.totalTokens;
                stages.push({
                    phase: 'model-reasoning',
                    source: `${result.provider}/${result.model}`,
                    sourceType: 'model',
                    output: result.content.slice(0, 500),
                    latency: result.latency,
                    tokens: result.usage.totalTokens,
                    timestamp: result.timestamp,
                });
            }
        }

        // ── Phase 2: Agent Critique ───────────────────────────
        const agentCritiques: AgentResult[] = [];
        if (agents.length > 0) {
            const proposalsSummary = modelProposals
                .map(p => `[${p.provider}/${p.model}]:\n${p.content}`)
                .join('\n\n---\n\n');

            const critiquePromises = agents.map(agent =>
                agent.run({
                    id: `${assemblyId}-critique-${agent.name}`,
                    description: `Review and critique AI model responses for: ${config.prompt}`,
                    input: `As the ${agent.name} agent, review these AI model proposals and provide expert critique from your domain.\n\nTask: ${config.prompt}\n\nModel Proposals:\n${proposalsSummary}\n\nProvide:\n1. Strengths of each proposal\n2. Critical issues or gaps from your ${agent.name} perspective\n3. Recommendations for improvement`,
                    context: config.context,
                })
            );
            const critiqueResults = await Promise.all(critiquePromises);

            for (const result of critiqueResults) {
                agentCritiques.push(result);
                stages.push({
                    phase: 'agent-critique',
                    source: result.agentName,
                    sourceType: 'agent',
                    output: result.output.slice(0, 500),
                    latency: result.totalLatency,
                    timestamp: result.timestamp,
                });
            }
        }

        // ── Phase 3: Model Improvement ────────────────────────
        const improvements: GenerateResponse[] = [];
        if (agentCritiques.length > 0 && models.length > 0) {
            const critiqueSummary = agentCritiques
                .map(c => `[${c.agentName} Agent Critique]:\n${c.output}`)
                .join('\n\n---\n\n');

            const improvePromises = models.map((model, i) =>
                this.sdk.generate({
                    model: model,
                    prompt: `Improve your response based on expert agent feedback.\n\nOriginal question: ${config.prompt}\n\nYour original response:\n${modelProposals[i]?.content || '(no proposal)'}\n\nAgent Critiques:\n${critiqueSummary}\n\nProvide an improved, comprehensive response that addresses all valid feedback from the expert agents.`,
                    systemPrompt: 'Integrate the expert feedback and produce a stronger response.',
                })
            );
            const improveResults = await Promise.all(improvePromises);

            for (const result of improveResults) {
                improvements.push(result);
                totalTokens += result.usage.totalTokens;
                stages.push({
                    phase: 'model-improvement',
                    source: `${result.provider}/${result.model}`,
                    sourceType: 'model',
                    output: result.content.slice(0, 500),
                    latency: result.latency,
                    tokens: result.usage.totalTokens,
                    timestamp: result.timestamp,
                });
            }
        }

        // ── Phase 4: Consensus ────────────────────────────────
        const finalResponses = improvements.length > 0 ? improvements : modelProposals;

        // If we only have agent results and no model responses, convert agent outputs
        if (finalResponses.length === 0 && agentCritiques.length > 0) {
            const agentResponses = this.convertAgentToResponses(agentCritiques);
            finalResponses.push(...agentResponses);
        }

        if (finalResponses.length === 0) {
            throw new Error('No responses to evaluate for consensus');
        }

        const consensusResult = this.consensusEngine.evaluate(finalResponses);

        stages.push({
            phase: 'consensus',
            source: 'consensus-engine',
            sourceType: 'model',
            output: `Winner: ${consensusResult.winner.provider}/${consensusResult.winner.model} | Confidence: ${(consensusResult.confidence * 100).toFixed(0)}%`,
            latency: 0,
            timestamp: Date.now(),
        });

        return {
            id: assemblyId,
            prompt: config.prompt,
            consensus: consensusResult.winner.content,
            confidence: consensusResult.confidence,
            reasoning: consensusResult.reasoning,
            stages,
            totalLatency: Date.now() - startTime,
            totalTokens,
            totalModels: models.length,
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

    private convertAgentToResponses(results: AgentResult[]): GenerateResponse[] {
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
