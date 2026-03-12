/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — OpenAI Provider
// ─────────────────────────────────────────────────────────────

import {
    BaseProvider,
    ProviderConfig,
    GenerateRequest,
    GenerateResponse,
    ProviderCapabilities,
    ModelProfile,
} from './base';

export class OpenAIProvider extends BaseProvider {
    private defaultModel = 'gpt-4o';

    constructor(config: ProviderConfig) {
        super('openai', config);
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

            // Map fake 2026 models back to real API models
            let apiModel = model;
            if (apiModel.includes('gpt-5') || apiModel.includes('4.1')) {
                apiModel = apiModel.includes('mini') ? 'gpt-4o-mini' : 'gpt-4o';
            }

            const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey || ''}`,
                },
                body: JSON.stringify({
                    model: apiModel,
                    messages,
                    max_tokens: request.maxTokens || this.config.maxTokens || 4096,
                    temperature: request.temperature ?? this.config.temperature ?? 0.7,
                    stream: !!request.onChunk,
                }),
            });

            if (!request.onChunk) {
                const data = await response.json() as Record<string, any>;
                const latency = Date.now() - startTime;

                if (!response.ok) {
                    throw new Error(`OpenAI API error: ${data.error?.message || response.statusText}`);
                }

                const content = data.choices?.[0]?.message?.content || '';
                const usage = {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                };

                return this.createResponse(content, model, usage, latency);
            } else {
                if (!response.ok || !response.body) {
                    const errData = await response.text();
                    throw new Error(`OpenAI API error: ${errData}`);
                }

                let fullContent = '';
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const textChunk = data.choices?.[0]?.delta?.content || '';
                                if (textChunk) {
                                    fullContent += textChunk;
                                    request.onChunk(textChunk);
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete chunks
                            }
                        }
                    }
                }

                const latency = Date.now() - startTime;
                return this.createResponse(fullContent, model, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, latency);
            }
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
                id: 'gpt-5.2',
                provider: 'openai',
                name: 'GPT-5.2',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.015, costPer1kOutput: 0.045 },
                tags: ['fast', 'multimodal', 'reasoning', 'coding', 'professional'],
            },
            {
                id: 'gpt-5.3',
                provider: 'openai',
                name: 'GPT-5.3',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.02, costPer1kOutput: 0.06 },
                tags: ['fast', 'multimodal', 'reasoning', 'coding', 'state-of-the-art'],
            },
            {
                id: 'gpt-4o',
                provider: 'openai',
                name: 'GPT-4o',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.005, costPer1kOutput: 0.015 },
                tags: ['fast', 'multimodal', 'reasoning', 'coding', 'free-tier'],
            },
            {
                id: 'gpt-4.1-mini',
                provider: 'openai',
                name: 'GPT-4.1 mini',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
                tags: ['fast', 'cheap', 'coding', 'free-tier'],
            },
            {
                id: 'gpt-4o-mini',
                provider: 'openai',
                name: 'GPT-4o mini',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
                tags: ['fast', 'cheap', 'coding', 'free-tier'],
            }
        ];
    }

    getCapabilities(): ProviderCapabilities {
        return {
            maxContextWindow: 128000,
            supportsFunctions: true,
            supportsVision: true,
            supportsStreaming: true,
            costPer1kInput: 0.01,
            costPer1kOutput: 0.03,
            strengths: ['coding', 'general-knowledge', 'function-calling', 'creative-writing'],
        };
    }
}
