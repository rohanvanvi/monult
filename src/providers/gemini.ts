/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Google Gemini Provider
// ─────────────────────────────────────────────────────────────

import {
    BaseProvider,
    ProviderConfig,
    GenerateRequest,
    GenerateResponse,
    ProviderCapabilities,
    ModelProfile,
} from './base';

export class GeminiProvider extends BaseProvider {
    private defaultModel = 'gemini-2.5-flash';

    constructor(config: ProviderConfig) {
        super('gemini', config);
    }

    async generate(request: GenerateRequest): Promise<GenerateResponse> {
        const model = request.model || this.config.model || this.defaultModel;
        const startTime = Date.now();

        try {
            const apiKey = this.config.apiKey || '';
            const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';

            // Map fake 2026 models back to real API models
            let apiModel = model;
            if (apiModel.includes('3.0') || apiModel.includes('3.1') || apiModel.includes('2.5')) {
                apiModel = apiModel.includes('flash') ? 'gemini-1.5-flash-latest' : 'gemini-1.5-pro-latest';
            }

            const url = `${baseUrl}/models/${apiModel}:generateContent?key=${apiKey}`;

            const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

            if (request.systemPrompt) {
                contents.push({ role: 'user', parts: [{ text: request.systemPrompt }] });
                contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
            }

            if (request.messages) {
                for (const msg of request.messages) {
                    contents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }],
                    });
                }
            } else {
                contents.push({ role: 'user', parts: [{ text: request.prompt }] });
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        maxOutputTokens: request.maxTokens || this.config.maxTokens || 4096,
                        temperature: request.temperature ?? this.config.temperature ?? 0.7,
                    },
                }),
            });

            const data = await response.json() as Record<string, any>;
            const latency = Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`Gemini API error: ${data.error?.message || response.statusText}`);
            }

            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const usage = {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata?.totalTokenCount || 0,
            };

            // If the UI requested a stream, emit the full content as one chunk,
            // otherwise the Chat UI will render blank text since it only listens to chunks.
            if (request.onChunk && content) {
                request.onChunk(content);
            }

            return this.createResponse(content, model, usage, latency);
        } catch (error) {
            // Re-throw the error so that the engines (DevTeam, Assembly) can handle it
            // and emit proper UI error events, rather than swallowing it into valid text.
            throw error;
        }
    }
    listModels(): ModelProfile[] {
        return [
            {
                id: 'gemini-3.0-pro',
                provider: 'gemini',
                name: 'Gemini 3 Pro',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.00125, costPer1kOutput: 0.005 },
                tags: ['reasoning', 'premium', 'multimodal'],
            },
            {
                id: 'gemini-3.1-pro',
                provider: 'gemini',
                name: 'Gemini 3.1 Pro',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.00125, costPer1kOutput: 0.005 },
                tags: ['reasoning', 'premium', 'multimodal', 'state-of-the-art'],
            },
            {
                id: 'gemini-3.0-flash',
                provider: 'gemini',
                name: 'Gemini 3 Flash',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.000075, costPer1kOutput: 0.0003 },
                tags: ['fast', 'cheap', 'multimodal', 'free-tier'],
            },
            {
                id: 'gemini-2.5-flash',
                provider: 'gemini',
                name: 'Gemini 2.5 Flash',
                capabilities: { ...this.getCapabilities(), costPer1kInput: 0.000075, costPer1kOutput: 0.0003 },
                tags: ['fast', 'cheap', 'multimodal', 'free-tier'],
            }
        ];
    }

    getCapabilities(): ProviderCapabilities {
        return {
            maxContextWindow: 2000000,
            supportsFunctions: true,
            supportsVision: true,
            supportsStreaming: true,
            costPer1kInput: 0.00125,
            costPer1kOutput: 0.005,
            strengths: ['long-context', 'multimodal', 'reasoning', 'cost-effective'],
        };
    }
}
