/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Universal AI SDK
// ─────────────────────────────────────────────────────────────

import {
    BaseProvider,
    ProviderConfig,
    GenerateRequest,
    GenerateResponse,
    ModelProfile,
} from '../providers/base';
import { ClaudeProvider } from '../providers/claude';
import { OpenAIProvider } from '../providers/openai';
import { GeminiProvider } from '../providers/gemini';
import { LocalProvider } from '../providers/local';
import { CohereProvider } from '../providers/cohere';

export interface MonultConfig {
    providers?: {
        claude?: ProviderConfig;
        openai?: ProviderConfig;
        gemini?: ProviderConfig;
        local?: ProviderConfig;
        cohere?: ProviderConfig;
        [key: string]: ProviderConfig | undefined;
    };
    defaultModel?: string;
    defaultProvider?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Unified AI SDK — the primary interface for interacting with AI models.
 *
 * @example
 * ```ts
 * const sdk = new UniversalSDK({
 *   providers: {
 *     openai: { apiKey: 'sk-...' },
 *     claude: { apiKey: 'sk-ant-...' },
 *   }
 * });
 *
 * const result = await sdk.generate({
 *   model: 'claude',
 *   prompt: 'Explain recursion'
 * });
 * ```
 */
export class UniversalSDK {
    private providers: Map<string, BaseProvider> = new Map();
    private config: MonultConfig;

    constructor(config: MonultConfig = {}) {
        this.config = config;
        this.initProviders();
    }

    private initProviders(): void {
        const providerConfigs = this.config.providers || {};

        if (providerConfigs.claude) {
            this.providers.set('claude', new ClaudeProvider(providerConfigs.claude));
        }
        if (providerConfigs.openai) {
            this.providers.set('openai', new OpenAIProvider(providerConfigs.openai));
        }
        if (providerConfigs.gemini) {
            this.providers.set('gemini', new GeminiProvider(providerConfigs.gemini));
        }
        if (providerConfigs.local) {
            this.providers.set('local', new LocalProvider(providerConfigs.local));
        }
        if (providerConfigs.cohere) {
            this.providers.set('cohere', new CohereProvider(providerConfigs.cohere));
        }
    }

    /**
     * Register a custom provider adapter.
     */
    registerProvider(name: string, provider: BaseProvider): void {
        this.providers.set(name, provider);
    }

    /**
     * Generate a response from a specific model or the default provider.
     * Implements automatic fallback to other providers if the primary fails.
     */
    async generate(request: GenerateRequest & { provider?: string }): Promise<GenerateResponse> {
        const primaryProviderName = request.provider || this.resolveProvider(request.model);
        const primaryProvider = this.providers.get(primaryProviderName);

        if (!primaryProvider) {
            // If no providers are configured, return a fallback response
            if (this.providers.size === 0) {
                return {
                    id: `fallback-${Date.now()}`,
                    content: "I'm sorry, but no AI providers are currently configured. Please configure at least one provider (OpenAI, Claude, Cohere, etc.) to use this feature.",
                    model: 'fallback',
                    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    latency: 0,
                    finishReason: 'error',
                    timestamp: Date.now(),
                    provider: 'fallback'
                };
            }
            
            throw new Error(
                `Provider "${primaryProviderName}" not configured. Available: ${[...this.providers.keys()].join(', ')}`
            );
        }

        try {
            // Try primary provider first
            return await primaryProvider.generate(request);
        } catch (error: any) {
            console.warn(`Primary provider ${primaryProviderName} failed:`, error.message);
            
            // If primary provider fails, try fallback providers
            const fallbackProviders = [...this.providers.keys()].filter(name => name !== primaryProviderName);

            for (const fallbackName of fallbackProviders) {
                const fallbackProvider = this.providers.get(fallbackName);
                if (fallbackProvider) {
                    try {
                        console.log(`Trying fallback provider: ${fallbackName}`);
                        
                        // Strip the provider-specific model string so the fallback provider uses its own default model
                        const fallbackRequest = { ...request };
                        delete fallbackRequest.model;
                        delete fallbackRequest.provider;

                        const result = await fallbackProvider.generate(fallbackRequest);
                        console.log(`Fallback successful with provider: ${fallbackName}`);
                        return result;
                    } catch (fallbackError: any) {
                        console.warn(`Fallback provider ${fallbackName} also failed:`, fallbackError.message);
                        continue;
                    }
                }
            }
            
            // If all providers fail, return a fallback response
            return {
                id: `fallback-${Date.now()}`,
                content: `I'm sorry, but all AI providers are currently unavailable. Primary error: ${error.message}`,
                model: 'fallback',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                latency: 0,
                finishReason: 'error',
                timestamp: Date.now(),
                provider: 'fallback'
            };
        }
    }

    /**
     * Generate responses from multiple providers in parallel.
     */
    async multiGenerate(
        request: GenerateRequest,
        providerNames?: string[]
    ): Promise<GenerateResponse[]> {
        const names = providerNames || [...this.providers.keys()];
        const promises = names.map(name => {
            const provider = this.providers.get(name);
            if (!provider) throw new Error(`Provider "${name}" not configured`);
            return provider.generate(request);
        });
        return Promise.all(promises);
    }

    /**
     * List all available models across all configured providers.
     */
    listModels(): ModelProfile[] {
        const models: ModelProfile[] = [];
        for (const provider of this.providers.values()) {
            models.push(...provider.listModels());
        }
        return models;
    }

    /**
     * List all configured provider names.
     */
    listProviders(): string[] {
        return [...this.providers.keys()];
    }

    /**
     * Get a specific provider instance.
     */
    getProvider(name: string): BaseProvider | undefined {
        return this.providers.get(name);
    }

    /**
     * Resolve which provider to use for a given model identifier.
     */
    private resolveProvider(model?: string): string {
        if (!model) {
            return this.config.defaultProvider || this.providers.keys().next().value || 'openai';
        }

        // Direct provider name match
        if (this.providers.has(model)) return model;

        // Model ID prefix matching
        if (model.startsWith('claude') || model.startsWith('anthropic')) return 'claude';
        if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
        if (model.startsWith('gemini')) return 'gemini';
        if (model.startsWith('llama') || model.startsWith('mistral') || model.startsWith('codellama') || model.startsWith('deepseek') || model.startsWith('qwen')) return 'local';
        if (model.startsWith('command') || model.startsWith('cohere')) return 'cohere';

        return this.config.defaultProvider || this.providers.keys().next().value || 'openai';
    }
}
