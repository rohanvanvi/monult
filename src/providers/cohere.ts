/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Cohere Provider Adapter
// ─────────────────────────────────────────────────────────────

import {
    BaseProvider,
    ProviderConfig,
    GenerateRequest,
    GenerateResponse,
    ModelProfile,
    ProviderCapabilities,
    TokenUsage,
} from './base';

/**
 * Cohere AI Provider — supports Command, Command R, and Command R+ models.
 */
export class CohereProvider extends BaseProvider {
    constructor(config: ProviderConfig) {
        super('cohere', config);
    }

    async generate(request: GenerateRequest): Promise<GenerateResponse> {
        // https://docs.cohere.com/docs/models#command
        const model = request.model || this.config.model || 'command-a-03-2025';
        const startTime = Date.now();

        const messages: any[] = [];
        if (request.systemPrompt) {
            messages.push({ role: 'system', content: request.systemPrompt });
        }

        if (request.messages && request.messages.length > 0) {
            messages.push(...request.messages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
                content: m.content
            })));
        }

        // append final prompt
        messages.push({ role: 'user', content: request.prompt });

        const body: Record<string, unknown> = {
            model,
            messages,
            max_tokens: request.maxTokens || this.config.maxTokens || 4096,
            temperature: request.temperature ?? this.config.temperature ?? 0.7,
            stream: !!request.onChunk,
        };

        const response = await fetch(
            `${this.config.baseUrl || 'https://api.cohere.com'}/v2/chat`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'X-Client-Name': 'monult',
                },
                body: JSON.stringify(body),
                signal: this.config.timeout ? AbortSignal.timeout(this.config.timeout) : undefined,
            }
        );

        if (!request.onChunk) {
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Cohere API error (${response.status}): ${error}`);
            }

            const data = await response.json() as Record<string, any>;
            const latency = Date.now() - startTime;

            const usage: TokenUsage = {
                promptTokens: data.meta?.tokens?.input_tokens || data.meta?.billed_units?.input_tokens || 0,
                completionTokens: data.meta?.tokens?.output_tokens || data.meta?.billed_units?.output_tokens || 0,
                totalTokens: 0, // Cohere doesn't always provide totalTokens easily, we can add them up later if needed
            };
            usage.totalTokens = (usage.promptTokens || 0) + (usage.completionTokens || 0);

            return this.createResponse(
                data.message?.content?.[0]?.text || data.text || '',
                model,
                usage,
                latency,
            );
        } else {
            if (!response.ok || !response.body) {
                const errData = await response.text();
                throw new Error(`Cohere API error: ${errData}`);
            }

            let fullContent = '';
            let usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer

                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;

                    // Cohere sometimes uses raw JSON, sometimes SSE `data: `
                    if (line.startsWith('data: ')) {
                        line = line.slice(6).trim();
                    }
                    if (line === '[DONE]') continue;

                    try {
                        const data = JSON.parse(line);
                        // Check v2 chunk formats
                        if (data.type === 'content-delta') {
                            const textChunk = data.delta?.message?.content?.text || '';
                            if (textChunk) {
                                fullContent += textChunk;
                                request.onChunk(textChunk);
                            }
                        } else if (data.type === 'message-end') {
                            const usageData = data.delta?.usage;
                            if (usageData) {
                                usage.promptTokens = usageData.tokens?.input_tokens || usageData.billed_units?.input_tokens || 0;
                                usage.completionTokens = usageData.tokens?.output_tokens || usageData.billed_units?.output_tokens || 0;
                                usage.totalTokens = usage.promptTokens + usage.completionTokens;
                            }
                        } else if (data.text) {
                            // Fallback for v1 streams if ever routed there
                            fullContent += data.text;
                            request.onChunk(data.text);
                        }
                    } catch (e) {
                        // ignore parse errors for partial chunks (should be rare given split('\n'))
                    }
                }
            }

            return this.createResponse(fullContent, model, usage, Date.now() - startTime);
        }
    }

    listModels(): ModelProfile[] {
        return [
            {
                id: 'command-a-03-2025',
                provider: 'cohere',
                name: 'Command A (03-2025)',
                capabilities: {
                    maxContextWindow: 256000,
                    supportsFunctions: true,
                    supportsVision: false,
                    supportsStreaming: true,
                    costPer1kInput: 0.003,
                    costPer1kOutput: 0.015,
                    strengths: ['reasoning', 'RAG', 'agents', 'multilingual'],
                },
                tags: ['reasoning', 'agents', 'performant'],
            },
            {
                id: 'command-r7b-12-2024',
                provider: 'cohere',
                name: 'Command R 7B (12-2024)',
                capabilities: {
                    maxContextWindow: 128000,
                    supportsFunctions: true,
                    supportsVision: false,
                    supportsStreaming: true,
                    costPer1kInput: 0.0003,
                    costPer1kOutput: 0.0006,
                    strengths: ['RAG', 'agents', 'complex-reasoning'],
                },
                tags: ['fast', 'small', 'reasoning'],
            },
            {
                id: 'command-a-translate-08-2025',
                provider: 'cohere',
                name: 'Command A Translate (08-2025)',
                capabilities: {
                    maxContextWindow: 8000,
                    supportsFunctions: false,
                    supportsVision: false,
                    supportsStreaming: true,
                    costPer1kInput: 0.001,
                    costPer1kOutput: 0.002,
                    strengths: ['translation', 'multilingual'],
                },
                tags: ['specialized', 'translation'],
            },
            {
                id: 'command-a-reasoning-08-2025',
                provider: 'cohere',
                name: 'Command A Reasoning (08-2025)',
                capabilities: {
                    maxContextWindow: 256000,
                    supportsFunctions: true,
                    supportsVision: false,
                    supportsStreaming: true,
                    costPer1kInput: 0.003,
                    costPer1kOutput: 0.015,
                    strengths: ['deep-reasoning', 'agents', 'problem-solving'],
                },
                tags: ['reasoning', 'agents'],
            },
            {
                id: 'command-a-vision-07-2025',
                provider: 'cohere',
                name: 'Command A Vision (07-2025)',
                capabilities: {
                    maxContextWindow: 128000,
                    supportsFunctions: true,
                    supportsVision: true,
                    supportsStreaming: false,
                    costPer1kInput: 0.003,
                    costPer1kOutput: 0.015,
                    strengths: ['vision', 'OCR', 'charts', 'graphs'],
                },
                tags: ['vision', 'multimodal'],
            },
            {
                id: 'command-r-plus-08-2024',
                provider: 'cohere',
                name: 'Command R+ (08-2024)',
                capabilities: {
                    maxContextWindow: 128000,
                    supportsFunctions: true,
                    supportsVision: false,
                    supportsStreaming: true,
                    costPer1kInput: 0.003,
                    costPer1kOutput: 0.015,
                    strengths: ['reasoning', 'RAG', 'long-context', 'multilingual'],
                },
                tags: ['reasoning', 'long-context'],
            },
            {
                id: 'command-r-08-2024',
                provider: 'cohere',
                name: 'Command R (08-2024)',
                capabilities: {
                    maxContextWindow: 128000,
                    supportsFunctions: true,
                    supportsVision: false,
                    supportsStreaming: true,
                    costPer1kInput: 0.0005,
                    costPer1kOutput: 0.0015,
                    strengths: ['fast', 'RAG', 'multilingual'],
                },
                tags: ['fast', 'cheap'],
            },
        ];
    }

    getCapabilities(): ProviderCapabilities {
        return {
            maxContextWindow: 128000,
            supportsFunctions: true,
            supportsVision: false,
            supportsStreaming: true,
            costPer1kInput: 0.003,
            costPer1kOutput: 0.015,
            strengths: ['reasoning', 'RAG', 'long-context', 'multilingual', 'search'],
        };
    }
}
