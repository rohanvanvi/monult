/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Provider Base Interface
// ─────────────────────────────────────────────────────────────

export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
}

export interface GenerateRequest {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
    onChunk?: (chunk: string) => void;
    tools?: ToolDefinition[];
    messages?: Message[];
}

export interface GenerateResponse {
    id: string;
    content: string;
    model: string;
    provider: string;
    usage: TokenUsage;
    latency: number;
    confidence?: number;
    reasoning?: string;
    finishReason: 'stop' | 'length' | 'tool_call' | 'error';
    timestamp: number;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    toolCallId?: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export interface ProviderCapabilities {
    maxContextWindow: number;
    supportsFunctions: boolean;
    supportsVision: boolean;
    supportsStreaming: boolean;
    costPer1kInput: number;
    costPer1kOutput: number;
    strengths: string[];
}

export interface ModelProfile {
    id: string;
    provider: string;
    name: string;
    capabilities: ProviderCapabilities;
    tags: string[];
}

/**
 * Abstract base class for all AI provider adapters.
 * Each provider (Claude, OpenAI, Gemini, Local) extends this.
 */
export abstract class BaseProvider {
    readonly name: string;
    protected config: ProviderConfig;

    constructor(name: string, config: ProviderConfig) {
        this.name = name;
        this.config = config;
    }

    abstract generate(request: GenerateRequest): Promise<GenerateResponse>;
    abstract listModels(): ModelProfile[];
    abstract getCapabilities(): ProviderCapabilities;

    protected createResponse(
        content: string,
        model: string,
        usage: TokenUsage,
        latency: number
    ): GenerateResponse {
        return {
            id: `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            content,
            model,
            provider: this.name,
            usage,
            latency,
            finishReason: 'stop',
            timestamp: Date.now(),
        };
    }
}
