/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Claude (Anthropic) Provider
// ─────────────────────────────────────────────────────────────

import {
    BaseProvider,
    ProviderConfig,
    GenerateRequest,
    GenerateResponse,
    ProviderCapabilities,
    ModelProfile,
} from './base';

export class ClaudeProvider extends BaseProvider {
    private defaultModel = 'claude-3-5-sonnet-20241022';

    constructor(config: ProviderConfig) {
        super('claude', config);
    }

    async generate(request: GenerateRequest): Promise<GenerateResponse> {
        const model = request.model || this.config.model || this.defaultModel;
        const startTime = Date.now();

        try {
            // Map fake 2026 models back to real API models
            let apiModel = model;
            if (apiModel.includes('4.5') || apiModel.includes('4.6')) {
                apiModel = apiModel.includes('opus') ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20241022';
            }

            const response = await fetch(`${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey || '',
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: apiModel,
                    max_tokens: request.maxTokens || this.config.maxTokens || 4096,
                    temperature: request.temperature ?? this.config.temperature ?? 0.7,
                    system: request.systemPrompt,
                    messages: request.messages || [{ role: 'user', content: request.prompt }],
                }),
            });

            const data = await response.json() as Record<string, any>;
            const latency = Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`Claude API error: ${data.error?.message || response.statusText}`);
            }

            const content = data.content?.[0]?.text || '';
            const usage = {
                promptTokens: data.usage?.input_tokens || 0,
                completionTokens: data.usage?.output_tokens || 0,
                totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
            };

            if (request.onChunk && content) {
                request.onChunk(content);
            }

            return this.createResponse(content, model, usage, latency);
        } catch (error) {
            const latency = Date.now() - startTime;
            return {
                ...this.createResponse('', model, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, latency),
                finishReason: 'error',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    listModels(): ModelProfile[] {
        return [
            {
                id: 'claude-3-5-sonnet-20241022',
                provider: 'claude',
                name: 'Claude 3.5 Sonnet',
                capabilities: this.getCapabilities(),
                tags: ['reasoning', 'coding', 'analysis', 'creative'],
            },
            {
                id: 'claude-4-6-sonnet',
                provider: 'claude',
                name: 'Claude Sonnet 4.6',
                capabilities: this.getCapabilities(),
                tags: ['reasoning', 'coding', 'analysis', 'creative', 'premium', 'free-tier'],
            },
            {
                id: 'claude-4-6-opus',
                provider: 'claude',
                name: 'Claude Opus 4.6',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.015, costPer1kOutput: 0.075 },
                tags: ['reasoning', 'complex-tasks', 'research', 'premium'],
            },
            {
                id: 'claude-4-5-haiku',
                provider: 'claude',
                name: 'Claude Haiku 4.5',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.001, costPer1kOutput: 0.005, maxContextWindow: 200000 },
                tags: ['fast', 'cheap', 'reasoning', 'free-tier'],
            },
            {
                id: 'claude-3-5-haiku-20241022',
                provider: 'claude',
                name: 'Claude 3.5 Haiku',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.001, costPer1kOutput: 0.005, maxContextWindow: 200000 },
                tags: ['fast', 'cheap', 'reasoning', 'free-tier'],
            },
        ];
    }

    getCapabilities(): ProviderCapabilities {
        return {
            maxContextWindow: 200000,
            supportsFunctions: true,
            supportsVision: true,
            supportsStreaming: true,
            costPer1kInput: 0.003,
            costPer1kOutput: 0.015,
            strengths: ['reasoning', 'coding', 'analysis', 'safety', 'instruction-following'],
        };
    }
}
