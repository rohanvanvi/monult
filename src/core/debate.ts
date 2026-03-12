/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — AI Debate System
// ─────────────────────────────────────────────────────────────
// Structured multi-round debates between AI models.
// Each model argues for a position, responds to critiques,
// and iterates toward a stronger consensus answer.
// ─────────────────────────────────────────────────────────────

import { UniversalSDK } from './sdk';
import { GenerateResponse } from '../providers/base';

export interface DebateConfig {
    topic: string;
    models: string[];
    rounds: number;
    initialProposal?: string;
    systemContext?: string;
    onProgress?: (event: {
        type: 'stage_start' | 'stage_chunk' | 'stage_complete' | 'debate_complete';
        stage?: string;
        model?: string;
        role?: DebateArgument['role'] | 'orchestrator';
        chunk?: string;
        data?: any;
    }) => void;
}

export interface DebateArgument {
    model: string;
    round: number;
    role: 'proposer' | 'challenger' | 'synthesizer';
    content: string;
    response: GenerateResponse;
    timestamp: number;
}

export interface DebateResult {
    id: string;
    topic: string;
    rounds: DebateArgument[][];
    finalConsensus: string;
    participatingModels: string[];
    totalRounds: number;
    timestamp: number;
}

/**
 * AI Debate Engine — structured argumentation between models.
 *
 * Models take turns proposing, challenging, and synthesizing
 * to converge on the strongest answer.
 */
export class DebateEngine {
    private sdk: UniversalSDK;

    constructor(sdk: UniversalSDK) {
        this.sdk = sdk;
    }

    /**
     * Run a full debate between models.
     */
    async debate(config: DebateConfig): Promise<DebateResult> {
        const debateId = `dbt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const allRounds: DebateArgument[][] = [];
        let currentBestAnswer = config.initialProposal || '';

        // ── Initial proposals from all models ──────────────────
        if (!config.initialProposal) {
            const initialRound: DebateArgument[] = [];
            for (const model of config.models) {
                config.onProgress?.({ type: 'stage_start', stage: 'Initial Proposal', model, role: 'proposer' });

                const response = await this.sdk.generate({
                    model: model,
                    prompt: `Provide your best answer to: ${config.topic}`,
                    systemPrompt: config.systemContext || 'You are participating in an AI debate. Give your strongest, well-reasoned answer.',
                    onChunk: (chunk: string) => config.onProgress?.({ type: 'stage_chunk', chunk })
                } as any);

                const argument = {
                    model,
                    round: 0,
                    role: 'proposer' as const,
                    content: response.content,
                    response,
                    timestamp: Date.now(),
                };
                initialRound.push(argument);
                config.onProgress?.({ type: 'stage_complete', stage: 'Initial Proposal', data: argument });
            }
            allRounds.push(initialRound);
            currentBestAnswer = initialRound[0]?.content || '';
        }

        // ── Debate rounds ──────────────────────────────────────
        for (let round = 1; round <= config.rounds; round++) {
            const roundArguments: DebateArgument[] = [];

            for (let i = 0; i < config.models.length; i++) {
                const model = config.models[i];
                const otherModels = config.models.filter((_, j) => j !== i);
                const previousArguments = allRounds.length > 0
                    ? allRounds[allRounds.length - 1]
                        .filter(a => a.model !== model)
                        .map(a => `${a.model}: ${a.content}`)
                        .join('\n\n---\n\n')
                    : currentBestAnswer;

                const role: DebateArgument['role'] = i === 0 ? 'proposer' : i === config.models.length - 1 ? 'synthesizer' : 'challenger';
                const rolePrompt = this.getRolePrompt(role, round);

                config.onProgress?.({ type: 'stage_start', stage: `Round ${round}`, model, role });

                const response = await this.sdk.generate({
                    model: model,
                    prompt: `${rolePrompt}\n\nTopic: ${config.topic}\n\nCurrent best answer:\n${currentBestAnswer}\n\nOther participants' arguments:\n${previousArguments}\n\nProvide your ${role === 'synthesizer' ? 'synthesis' : role === 'challenger' ? 'challenge and alternative' : 'improved proposal'}.`,
                    systemPrompt: `You are a ${role} in round ${round} of an AI debate. ${rolePrompt}`,
                    onChunk: (chunk: string) => config.onProgress?.({ type: 'stage_chunk', chunk })
                } as any);

                const argument = {
                    model,
                    round,
                    role,
                    content: response.content,
                    response,
                    timestamp: Date.now(),
                };
                roundArguments.push(argument);
                config.onProgress?.({ type: 'stage_complete', stage: `Round ${round}`, data: argument });
            }

            allRounds.push(roundArguments);

            // Update best answer from synthesizer or last participant
            const synthesizer = roundArguments.find(a => a.role === 'synthesizer');
            if (synthesizer) {
                currentBestAnswer = synthesizer.content;
            }
        }

        // ── Final synthesis ────────────────────────────────────
        const synthesizerModel = config.models[config.models.length - 1] || config.models[0];
        const allArgsSummary = allRounds
            .flat()
            .map(a => `[Round ${a.round}] ${a.model} (${a.role}): ${a.content.slice(0, 500)}`)
            .join('\n\n');

        config.onProgress?.({ type: 'stage_start', stage: 'Final Consensus', model: synthesizerModel, role: 'synthesizer' });

        const finalSynthesis = await this.sdk.generate({
            model: synthesizerModel,
            prompt: `Synthesize the entire debate into a final, comprehensive answer.\n\nTopic: ${config.topic}\n\nFull debate history:\n${allArgsSummary}\n\nProvide the strongest possible answer that incorporates the best arguments from all participants.`,
            systemPrompt: 'You are the final synthesizer. Produce the best answer from all debate contributions.',
            onChunk: (chunk: string) => config.onProgress?.({ type: 'stage_chunk', chunk })
        } as any);

        config.onProgress?.({ type: 'stage_complete', stage: 'Final Consensus', data: finalSynthesis });

        const result: DebateResult = {
            id: debateId,
            topic: config.topic,
            rounds: allRounds,
            finalConsensus: finalSynthesis.content,
            participatingModels: config.models,
            totalRounds: config.rounds,
            timestamp: Date.now(),
        };

        config.onProgress?.({ type: 'debate_complete', data: result });
        return result;
    }

    private getRolePrompt(role: DebateArgument['role'], round: number): string {
        switch (role) {
            case 'proposer':
                return `Round ${round}: Propose an improved answer. Build on strengths, address weaknesses identified by challengers.`;
            case 'challenger':
                return `Round ${round}: Challenge the current best answer. Find flaws, edge cases, and missing perspectives. Propose alternatives.`;
            case 'synthesizer':
                return `Round ${round}: Synthesize all arguments into the strongest possible answer. Resolve conflicts and merge the best ideas.`;
        }
    }
}
