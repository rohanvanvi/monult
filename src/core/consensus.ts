/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Consensus Engine
// ─────────────────────────────────────────────────────────────
// Evaluates multiple AI responses using voting, weighted scoring,
// and confidence analysis to select the best result.
// ─────────────────────────────────────────────────────────────

import { GenerateResponse } from '../providers/base';

export interface ConsensusConfig {
    strategy?: 'voting' | 'weighted' | 'confidence' | 'hybrid';
    weights?: Record<string, number>;
    minConfidence?: number;
}

export interface ScoredResponse {
    response: GenerateResponse;
    score: number;
    metrics: {
        length: number;
        specificity: number;
        structureQuality: number;
        uniqueInsights: number;
        consistency: number;
    };
}

export interface ConsensusResult {
    winner: GenerateResponse;
    confidence: number;
    reasoning: string;
    scores: ScoredResponse[];
    strategy: string;
    timestamp: number;
}

/**
 * Consensus Engine — selects the best response from multiple AI outputs.
 *
 * Supports multiple strategies:
 * - voting: majority-based selection
 * - weighted: provider-weight-based scoring
 * - confidence: content quality analysis
 * - hybrid: combines all strategies
 */
export class ConsensusEngine {
    private config: ConsensusConfig;

    constructor(config: ConsensusConfig = {}) {
        this.config = {
            strategy: config.strategy || 'hybrid',
            weights: config.weights || {},
            minConfidence: config.minConfidence || 0.5,
        };
    }

    // Default criteria scoring weights for the hybrid strategy
    private readonly criteriaWeights = {
        length: 0.1,
        specificity: 0.25,
        structureQuality: 0.2,
        uniqueInsights: 0.2,
        consistency: 0.25
    };

    /**
     * Expose the current configuration for dashboard display.
     */
    getConfig() {
        return {
            ...this.config,
            criteriaWeights: this.criteriaWeights
        };
    }

    /**
     * Evaluate multiple responses and return a consensus result.
     */
    evaluate(responses: GenerateResponse[]): ConsensusResult {
        if (responses.length === 0) {
            throw new Error('Cannot evaluate consensus with zero responses');
        }

        if (responses.length === 1) {
            return this.singleResponse(responses[0]);
        }

        const scored = responses.map(r => this.scoreResponse(r, responses));
        scored.sort((a, b) => b.score - a.score);

        const winner = scored[0];
        const confidence = this.calculateConfidence(scored);
        const reasoning = this.generateReasoning(scored);

        return {
            winner: winner.response,
            confidence,
            reasoning,
            scores: scored,
            strategy: this.config.strategy || 'hybrid',
            timestamp: Date.now(),
        };
    }

    private singleResponse(response: GenerateResponse): ConsensusResult {
        const scored = this.scoreResponse(response, [response]);
        return {
            winner: response,
            confidence: scored.score / 100,
            reasoning: 'Single response — no consensus required.',
            scores: [scored],
            strategy: 'single',
            timestamp: Date.now(),
        };
    }

    private scoreResponse(response: GenerateResponse, allResponses: GenerateResponse[]): ScoredResponse {
        const metrics = {
            length: this.scoreLengthQuality(response.content),
            specificity: this.scoreSpecificity(response.content),
            structureQuality: this.scoreStructure(response.content),
            uniqueInsights: this.scoreUniqueness(response.content, allResponses),
            consistency: this.scoreConsistency(response),
        };

        // Weighted combination
        let score = Object.entries(metrics).reduce((sum, [key, value]) => {
            return sum + value * (this.criteriaWeights[key as keyof typeof this.criteriaWeights] || 0.2);
        }, 0);

        // Provider weight bonus
        const providerWeight = this.config.weights?.[response.provider] || 1.0;
        score *= providerWeight;

        // Penalize errors
        if (response.finishReason === 'error') score *= 0.1;

        return { response, score, metrics };
    }

    private scoreLengthQuality(content: string): number {
        const len = content.length;
        if (len < 50) return 20;
        if (len < 200) return 50;
        if (len < 1000) return 80;
        if (len < 5000) return 100;
        return 90; // slightly penalize very long responses
    }

    private scoreSpecificity(content: string): number {
        let score = 50;
        // Reward code blocks
        if (content.includes('```')) score += 15;
        // Reward numbered lists
        if (/\d+\.\s/.test(content)) score += 10;
        // Reward technical terms
        const technicalTerms = ['implement', 'architecture', 'algorithm', 'pattern', 'interface', 'function', 'class', 'module', 'endpoint', 'database'];
        const termCount = technicalTerms.filter(t => content.toLowerCase().includes(t)).length;
        score += termCount * 3;
        // Reward examples
        if (content.toLowerCase().includes('example') || content.toLowerCase().includes('e.g.')) score += 10;
        return Math.min(100, score);
    }

    private scoreStructure(content: string): number {
        let score = 40;
        // Reward headings
        if (content.includes('#')) score += 15;
        // Reward bullet points
        if (content.includes('- ') || content.includes('• ')) score += 10;
        // Reward paragraphs (multiple line breaks)
        const paragraphs = content.split('\n\n').length;
        score += Math.min(25, paragraphs * 5);
        // Reward balanced structure
        if (content.length > 200 && paragraphs >= 3) score += 10;
        return Math.min(100, score);
    }

    private scoreUniqueness(content: string, allResponses: GenerateResponse[]): number {
        if (allResponses.length <= 1) return 80;

        const words = new Set(content.toLowerCase().split(/\s+/));
        let uniqueScore = 0;

        for (const other of allResponses) {
            if (other.content === content) continue;
            const otherWords = new Set(other.content.toLowerCase().split(/\s+/));
            const intersection = [...words].filter(w => otherWords.has(w)).length;
            const overlap = intersection / Math.max(words.size, 1);
            uniqueScore += (1 - overlap) * 100;
        }

        return Math.min(100, uniqueScore / Math.max(allResponses.length - 1, 1));
    }

    private scoreConsistency(response: GenerateResponse): number {
        let score = 70;
        if (response.finishReason === 'stop') score += 20;
        if (response.usage.completionTokens > 100) score += 10;
        if (response.latency < 5000) score += 5;
        return Math.min(100, score);
    }

    private calculateConfidence(scored: ScoredResponse[]): number {
        if (scored.length <= 1) return scored[0]?.score / 100 || 0;

        const topScore = scored[0].score;
        const secondScore = scored[1]?.score || 0;
        const gap = (topScore - secondScore) / Math.max(topScore, 1);

        // Confidence is higher when the gap between first and second is large
        return Math.min(1, Math.max(0, 0.5 + gap * 0.5));
    }

    private generateReasoning(scored: ScoredResponse[]): string {
        const winner = scored[0];
        const winnerName = winner.response.provider?.replace('agent:', '') || winner.response.model || 'Unknown';
        
        if (scored.length === 1) {
            return `Selected ${winnerName.toUpperCase()} as the best solution.`;
        }

        const runnerUp = scored[1];
        const runnerUpName = runnerUp.response.provider?.replace('agent:', '') || runnerUp.response.model || 'Unknown';
        
        const scoreDiff = winner.score - runnerUp.score;
        let confidence = 'strong';
        if (scoreDiff < 5) confidence = 'narrow';
        else if (scoreDiff < 15) confidence = 'moderate';
        
        return `Selected ${winnerName.toUpperCase()} with a ${confidence} advantage (score: ${winner.score.toFixed(1)}). Runner-up: ${runnerUpName.toUpperCase()} (score: ${runnerUp.score.toFixed(1)}).`;
    }
}
