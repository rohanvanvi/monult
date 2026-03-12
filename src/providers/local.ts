/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Local LLM Provider (Ollama compatible)
// ─────────────────────────────────────────────────────────────

import {
    BaseProvider,
    ProviderConfig,
    GenerateRequest,
    GenerateResponse,
    ProviderCapabilities,
    ModelProfile,
} from './base';

export class LocalProvider extends BaseProvider {
    private defaultModel = 'llama3';

    constructor(config: ProviderConfig) {
        super('local', {
            ...config,
            baseUrl: config.baseUrl || 'http://localhost:11434',
        });
    }

    async generate(request: GenerateRequest): Promise<GenerateResponse> {
        const model = request.model || this.config.model || this.defaultModel;
        const startTime = Date.now();

        try {
            const messages: Array<{ role: string; content: string }> = [];
            if (request.systemPrompt) {
                messages.push({ role: 'system', content: request.systemPrompt });
            }
            if (request.messages) {
                messages.push(...request.messages);
            } else {
                messages.push({ role: 'user', content: request.prompt });
            }

            const response = await fetch(`${this.config.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false,
                    options: {
                        temperature: request.temperature ?? this.config.temperature ?? 0.7,
                        num_predict: request.maxTokens || this.config.maxTokens || 4096,
                    },
                }),
            });

            const data = await response.json() as Record<string, any>;
            const latency = Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`Local LLM error: ${data.error || response.statusText}`);
            }

            const content = data.message?.content || '';
            const usage = {
                promptTokens: data.prompt_eval_count || 0,
                completionTokens: data.eval_count || 0,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
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
                id: 'deepseek-v3',
                provider: 'local',
                name: 'DeepSeek V3',
                capabilities: this.getCapabilities(),
                tags: ['open-source', 'general-purpose', 'private', 'free-tier'],
            },
            {
                id: 'llama-4-scout',
                provider: 'local',
                name: 'LLaMA 4 Scout',
                capabilities: this.getCapabilities(),
                tags: ['open-source', 'general-purpose', 'private', 'free-tier'],
            },
            {
                id: 'qwen-2.5',
                provider: 'local',
                name: 'Qwen 2.5',
                capabilities: this.getCapabilities(),
                tags: ['open-source', 'general-purpose', 'private', 'free-tier'],
            },
            {
                id: 'mistral-large-3',
                provider: 'local',
                name: 'Mistral Large 3',
                capabilities: this.getCapabilities(),
                tags: ['open-source', 'general-purpose', 'private', 'premium'],
            },
            {
                id: 'llama3',
                provider: 'local',
                name: 'Llama 3',
                capabilities: this.getCapabilities(),
                tags: ['open-source', 'general-purpose', 'private'],
            },
            {
                id: 'codellama',
                provider: 'local',
                name: 'Code Llama',
                capabilities: { ...this.getCapabilities(), strengths: ['coding', 'debugging'] },
                tags: ['coding', 'open-source', 'private'],
            },
            {
                id: 'mistral',
                provider: 'local',
                name: 'Mistral',
                capabilities: this.getCapabilities(),
                tags: ['fast', 'efficient', 'open-source'],
            },
        ];
    }

    getCapabilities(): ProviderCapabilities {
        return {
            maxContextWindow: 8192,
            supportsFunctions: false,
            supportsVision: false,
            supportsStreaming: true,
            costPer1kInput: 0,
            costPer1kOutput: 0,
            strengths: ['privacy', 'no-cost', 'offline', 'customizable'],
        };
    }
}
