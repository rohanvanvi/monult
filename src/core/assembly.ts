/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — AI Assembly Engine
// ─────────────────────────────────────────────────────────────
// Orchestrates multi-model collaboration pipelines:
// propose → critique → improve → verify → merge
// ─────────────────────────────────────────────────────────────

import { UniversalSDK } from './sdk';
import { GenerateResponse } from '../providers/base';
import { DebateEngine, DebateResult } from './debate';
import { ConsensusEngine, ConsensusResult } from './consensus';

export interface AssemblyConfig {
    models: string[];
    debate?: boolean;
    verify?: boolean;
    rounds?: number;
    maxRetries?: number;
    timeout?: number;
}

export interface AssemblyStage {
    name: string;
    model: string;
    role: 'proposer' | 'critic' | 'improver' | 'verifier' | 'orchestrator';
    response: GenerateResponse;
    timestamp: number;
}

export type AssemblyProgressCallback = (event: {
    type: 'stage_start' | 'stage_chunk' | 'stage_complete' | 'consensus_complete';
    stage?: string;
    model?: string;
    role?: AssemblyStage['role'];
    chunk?: string;
    data?: any;
}) => void;

export interface AssemblyResult {
    id: string;
    consensus: string;
    confidence: number;
    reasoning: string;
    stages: AssemblyStage[];
    debate?: DebateResult;
    consensusResult?: ConsensusResult;
    totalLatency: number;
    totalTokens: number;
    totalCost: number;
    timestamp: number;
}

/**
 * AI Assembly Engine — coordinates multi-model collaboration.
 *
 * @example
 * ```ts
 * const result = await assembly.run({
 *   models: ['claude', 'openai', 'gemini'],
 *   debate: true,
 *   verify: true,
 *   prompt: 'Design a scalable microservices architecture'
 * });
 * ```
 */
export class AssemblyEngine {
    private sdk: UniversalSDK;
    private debateEngine: DebateEngine;
    private consensusEngine: ConsensusEngine;

    constructor(sdk: UniversalSDK) {
        this.sdk = sdk;
        this.debateEngine = new DebateEngine(sdk);
        this.consensusEngine = new ConsensusEngine();
    }

    /**
     * Run a full assembly pipeline with multiple models collaborating.
     */
    async run(config: AssemblyConfig & { prompt: string; systemPrompt?: string; onProgress?: AssemblyProgressCallback }): Promise<AssemblyResult> {
        const startTime = Date.now();
        const stages: AssemblyStage[] = [];
        const assemblyId = `asm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const models = config.models;
        if (models.length === 0) throw new Error('Assembly requires at least one model');

        const { onProgress } = config;

        // ── Stage 1: Proposal ──────────────────────────────────
        const proposalModel = models[0];

        onProgress?.({ type: 'stage_start', stage: 'Proposal', model: proposalModel, role: 'proposer' });

        const proposal = await this.sdk.generate({
            model: proposalModel,
            prompt: config.prompt,
            systemPrompt: config.systemPrompt || 'You are contributing to an AI assembly. Provide a thorough, well-structured response.',
            onChunk: (chunk: string) => onProgress?.({ type: 'stage_chunk', chunk })
        } as any);

        stages.push(this.createStage('Proposal', proposalModel, 'proposer', proposal));
        onProgress?.({ type: 'stage_complete', stage: 'Proposal', data: proposal });

        // ── Stage 2: Critique ──────────────────────────────────
        let critiques: GenerateResponse[] = [];
        if (models.length > 1) {
            // In SSE mode, run critiques sequentially so the UI can stream them one by one cleanly, 
            // otherwise Promise.all causes interwoven chunks.
            for (let i = 1; i < models.length; i++) {
                const model = models[i];
                onProgress?.({ type: 'stage_start', stage: `Critique ${i}`, model, role: 'critic' });

                const critique = await this.sdk.generate({
                    model: model,
                    prompt: `Review and critique the following response. Identify strengths, weaknesses, and areas for improvement.\n\nOriginal question: ${config.prompt}\n\nResponse to review:\n${proposal.content}`,
                    systemPrompt: 'You are a critical reviewer. Analyze the response thoroughly — find flaws, gaps, and improvements.',
                    onChunk: (chunk: string) => onProgress?.({ type: 'stage_chunk', chunk })
                } as any);

                critiques.push(critique);
                stages.push(this.createStage(`Critique ${i}`, model, 'critic', critique));
                onProgress?.({ type: 'stage_complete', stage: `Critique ${i}`, data: critique });
            }
        }

        // ── Stage 3: Improvement ───────────────────────────────
        let improvement: GenerateResponse | undefined;
        if (critiques.length > 0) {
            const critiquesSummary = critiques.map((c, i) => `Critique ${i + 1} (${models[i + 1]}):\n${c.content}`).join('\n\n');

            onProgress?.({ type: 'stage_start', stage: 'Improvement', model: proposalModel, role: 'improver' });

            improvement = await this.sdk.generate({
                model: proposalModel,
                prompt: `Improve your original response based on these critiques.\n\nOriginal question: ${config.prompt}\n\nYour original response:\n${proposal.content}\n\nCritiques received:\n${critiquesSummary}\n\nProvide an improved response that addresses all valid critiques.`,
                systemPrompt: 'Integrate the feedback and produce a stronger, more comprehensive response.',
                onChunk: (chunk: string) => onProgress?.({ type: 'stage_chunk', chunk })
            } as any);

            stages.push(this.createStage('Improvement', proposalModel, 'improver', improvement));
            onProgress?.({ type: 'stage_complete', stage: 'Improvement', data: improvement });
        }

        // ── Stage 4: Debate (optional) ─────────────────────────
        let debateResult: DebateResult | undefined;
        if (config.debate && models.length >= 2) {
            debateResult = await this.debateEngine.debate({
                topic: config.prompt,
                models: models.slice(0, 3),
                rounds: config.rounds || 2,
                initialProposal: (improvement || proposal).content,
            });
        }

        // ── Stage 5: Verification ──────────────────────────────
        let verification: GenerateResponse | undefined;
        if (config.verify && models.length > 1) {
            const verifierModel = models[models.length - 1];
            const bestAnswer = debateResult?.finalConsensus || (improvement || proposal).content;

            onProgress?.({ type: 'stage_start', stage: 'Verification', model: verifierModel, role: 'verifier' });

            verification = await this.sdk.generate({
                model: verifierModel,
                prompt: `Verify the following answer for correctness, completeness, and quality.\n\nOriginal question: ${config.prompt}\n\nAnswer to verify:\n${bestAnswer}\n\nProvide:\n1. Verification status (VERIFIED / NEEDS_REVISION / REJECTED)\n2. Confidence score (0-100)\n3. Any remaining issues or improvements`,
                systemPrompt: 'You are a verification expert. Carefully check the answer for accuracy and completeness.',
                onChunk: (chunk: string) => onProgress?.({ type: 'stage_chunk', chunk })
            } as any);

            stages.push(this.createStage('Verification', verifierModel, 'verifier', verification));
            onProgress?.({ type: 'stage_complete', stage: 'Verification', data: verification });
        }

        // ── Stage 6: Build consensus ───────────────────────────
        onProgress?.({ type: 'stage_start', stage: 'Consensus Evaluation', role: 'orchestrator', model: 'system' });
        const allResponses = [proposal, ...critiques, improvement, verification].filter(Boolean) as GenerateResponse[];
        const consensusResult = this.consensusEngine.evaluate(allResponses);
        onProgress?.({ type: 'stage_complete', stage: 'Consensus Evaluation', role: 'orchestrator', model: 'system', data: { output: 'Consensus evaluation complete.' } });
        onProgress?.({ type: 'consensus_complete', data: consensusResult });

        // ── Final result ───────────────────────────────────────
        const finalContent = debateResult?.finalConsensus
            || (improvement || proposal).content;

        const totalLatency = Date.now() - startTime;
        const totalTokens = stages.reduce((sum, s) => sum + s.response.usage.totalTokens, 0);

        return {
            id: assemblyId,
            consensus: finalContent,
            confidence: consensusResult.confidence,
            reasoning: consensusResult.reasoning,
            stages,
            debate: debateResult,
            consensusResult,
            totalLatency,
            totalTokens,
            totalCost: this.estimateCost(stages),
            timestamp: Date.now(),
        };
    }

    private createStage(name: string, model: string, role: AssemblyStage['role'], response: GenerateResponse): AssemblyStage {
        return { name, model, role, response, timestamp: Date.now() };
    }

    private estimateCost(stages: AssemblyStage[]): number {
        return stages.reduce((cost, stage) => {
            const usage = stage.response.usage;
            // Rough estimate: $0.01 per 1k tokens average
            return cost + (usage.totalTokens / 1000) * 0.01;
        }, 0);
    }
}
