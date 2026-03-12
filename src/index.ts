/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Main SDK Entry Point
// ─────────────────────────────────────────────────────────────
// The primary Monult class that ties everything together.
// ─────────────────────────────────────────────────────────────

import { UniversalSDK, MonultConfig } from './core/sdk';
import { AssemblyEngine, AssemblyConfig, AssemblyResult } from './core/assembly';
import { AgentAssemblyEngine, AgentAssemblyConfig, AgentAssemblyResult } from './core/agent-assembly';
import { HybridAssemblyEngine, HybridAssemblyConfig, HybridAssemblyResult } from './core/hybrid-assembly';
import { AssemblyGraph } from './core/assembly-graph';
import { SmartRouter } from './core/router';
import { CostOptimizer, RouteOptimizationOptions } from './core/cost-optimizer';
import { ModelBenchmarker, BenchmarkResult } from './core/benchmark';
import { IntentEngine } from './core/intent';
import { ContextManager } from './memory/context-manager';
import { VectorStore } from './memory/vector-store';
import { AgentRegistry } from './agents/registry';
import { DebuggerAgent } from './agents/debugger';
import { ArchitectAgent } from './agents/architect';
import { SecurityAgent } from './agents/security';
import { DevOpsAgent } from './agents/devops';
import { DocsAgent } from './agents/docs';
import { FrontendAgent } from './agents/frontend';
import { BackendAgent } from './agents/backend';
import { PerformanceAgent } from './agents/performance';
import { WorkflowEngine } from './workflows/engine';
import { PluginRegistry } from './plugins/registry';
import { SecurityEngine } from './security/engine';
import { CostTracker } from './cost/tracker';
import { DevTeamEngine } from './core/devteam';
import { WorkspaceManager } from './core/workspace-manager';
import { BaseProvider, GenerateRequest, GenerateResponse } from './providers/base';

/**
 * Monult — Multi-Model AI Operating System
 *
 * @example
 * ```ts
 * const monult = new Monult({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY },
 *     claude: { apiKey: process.env.ANTHROPIC_API_KEY },
 *     cohere: { apiKey: process.env.COHERE_API_KEY },
 *   }
 * });
 *
 * // Simple generation
 * const result = await monult.generate({ prompt: 'Hello!' });
 *
 * // Multi-model assembly
 * const assembly = await monult.assembly({
 *   models: ['claude', 'openai', 'cohere'],
 *   debate: true,
 *   prompt: 'Design a REST API'
 * });
 *
 * // Agent assembly
 * const agentResult = await monult.agentAssembly({
 *   agents: ['architect', 'security', 'devops'],
 *   task: 'Design a scalable backend',
 * });
 *
 * // Hybrid assembly (models + agents)
 * const hybrid = await monult.hybridAssembly({
 *   models: ['claude', 'openai'],
 *   agents: ['architect', 'security'],
 *   prompt: 'Design secure auth',
 * });
 *
 * // Register a custom provider
 * monult.registerProvider('my-model', myCustomProvider);
 * ```
 */
export class Monult {
    readonly sdk: UniversalSDK;
    readonly assemblyEngine: AssemblyEngine;
    readonly agentAssemblyEngine: AgentAssemblyEngine;
    readonly hybridAssemblyEngine: HybridAssemblyEngine;
    readonly devTeamEngine: DevTeamEngine;
    readonly assemblyGraph: AssemblyGraph;
    readonly router: SmartRouter;
    readonly costOptimizer: CostOptimizer;
    readonly benchmarker: ModelBenchmarker;
    readonly intentEngine: IntentEngine;
    readonly memory: ContextManager;
    readonly vectorStore: VectorStore;
    readonly agentRegistry: AgentRegistry;
    readonly workflows: WorkflowEngine;
    readonly plugins: PluginRegistry;
    readonly securityEngine: SecurityEngine;
    readonly costTracker: CostTracker;
    readonly workspaceManager: WorkspaceManager;

    constructor(config?: MonultConfig, globalConfig?: import('./config/config-manager').GlobalConfig) {
        // Auto-discover config from environment variables
        const resolvedConfig = config || this.autoConfig(globalConfig);

        // Initialize core systems
        this.vectorStore = new VectorStore();
        this.memory = new ContextManager(this.vectorStore);
        this.sdk = new UniversalSDK(resolvedConfig);
        this.assemblyGraph = new AssemblyGraph();
        this.assemblyEngine = new AssemblyEngine(this.sdk);
        this.router = new SmartRouter(this.sdk);
        this.costOptimizer = new CostOptimizer(this.sdk);
        this.benchmarker = new ModelBenchmarker(this.sdk);
        this.intentEngine = new IntentEngine();
        this.securityEngine = new SecurityEngine();
        this.costTracker = new CostTracker();
        this.workspaceManager = new WorkspaceManager();
        this.workflows = new WorkflowEngine(this);
        this.plugins = new PluginRegistry(this);

        // Initialize agent registry with built-in agents
        this.agentRegistry = new AgentRegistry();
        this.registerBuiltInAgents();

        // Initialize agent & hybrid assembly engines
        this.agentAssemblyEngine = new AgentAssemblyEngine(this.agentRegistry, this.sdk);
        this.hybridAssemblyEngine = new HybridAssemblyEngine(this.sdk, this.agentRegistry);
        this.devTeamEngine = new DevTeamEngine(this.agentRegistry, this.sdk, this.memory, this.costTracker);
    }

    /**
     * Alias for assemblyGraph to match API spec.
     */
    get graph() {
        return this.assemblyGraph;
    }

    /**
     * Register a custom AI provider at runtime.
     * Allows developers to add any AI model support dynamically.
     *
     * @example
     * ```ts
     * monult.registerProvider('my-model', new MyCustomProvider({ apiKey: '...' }));
     * await monult.generate({ provider: 'my-model', prompt: 'Hello!' });
     * ```
     */
    registerProvider(name: string, provider: BaseProvider): void {
        this.sdk.registerProvider(name, provider);
    }

    /**
     * Generate a response from an AI model.
     */
    async generate(request: GenerateRequest & { provider?: string }): Promise<GenerateResponse> {
        // Security check
        const securityCheck = this.securityEngine.scanPrompt(request.prompt);
        if (!securityCheck.safe) {
            const sanitized = this.securityEngine.sanitize(request.prompt);
            request = { ...request, prompt: sanitized };
        }

        // Auto-route if no provider specified
        if (!request.provider && !request.model) {
            const route = this.router.route(request.prompt);
            request.provider = route.model.provider;
            request.model = route.model.id;
        }

        const response = await this.sdk.generate(request);

        // Track cost
        this.costTracker.track(response);

        // Store in memory
        this.memory.addMessage('default', 'user', request.prompt);
        this.memory.addMessage('default', 'assistant', response.content);

        return response;
    }

    /**
     * Ask a question, with optional cost-optimized routing.
     */
    async ask(prompt: string, options?: RouteOptimizationOptions): Promise<GenerateResponse> {
        let request: GenerateRequest & { provider?: string } = { prompt };

        if (options?.optimizeCost) {
            const optimized = this.costOptimizer.optimizeRoute(prompt, options);
            if (optimized.selectedModel !== 'auto') {
                const parts = optimized.selectedModel.split(':');
                request.provider = parts[0];
                request.model = parts[1] || parts[0];
            }
        }

        return this.generate(request);
    }

    /**
     * Benchmark models with a prompt.
     */
    async benchmark(prompt: string): Promise<BenchmarkResult[]> {
        return this.benchmarker.runBenchmark(prompt);
    }

    /**
     * Run a multi-model assembly.
     */
    async assembly(config: AssemblyConfig & { prompt: string; systemPrompt?: string; onProgress?: import('./core/assembly').AssemblyProgressCallback }): Promise<AssemblyResult> {
        return this.assemblyEngine.run(config);
    }

    /**
     * Run a multi-agent assembly.
     * Multiple agents propose, critique, improve, and reach consensus.
     *
     * @example
     * ```ts
     * const result = await monult.agentAssembly({
     *   agents: ['architect', 'security', 'devops'],
     *   task: 'Design a scalable backend architecture',
     * });
     * ```
     */
    async agentAssembly(config: AgentAssemblyConfig & { onProgress?: any }): Promise<AgentAssemblyResult> {
        return this.agentAssemblyEngine.run(config as any);
    }

    /**
     * Run a DevTeam simulation.
     * Executes an AI development team with real work capabilities.
     *
     * @example
     * ```ts
     * const result = await monult.devteam('Build a scalable auth service with Next.js and Redis');
     * ```
     */
    async devteam(task: string, workspace?: string, agents?: string[], enableConsensus?: boolean) {
        return this.devTeamEngine.execute({
            task,
            workspace,
            agents,
            enableConsensus,
            onProgress: () => {} // Progress handled via API streaming
        });
    }

    /**
     * Run a hybrid assembly with both models and agents.
     * Models generate proposals, agents critique, models improve, consensus selects winner.
     *
     * @example
     * ```ts
     * const result = await monult.hybridAssembly({
     *   models: ['claude', 'openai', 'cohere'],
     *   agents: ['architect', 'security'],
     *   prompt: 'Design a secure authentication system',
     * });
     * ```
     */
    async hybridAssembly(config: HybridAssemblyConfig): Promise<HybridAssemblyResult> {
        return this.hybridAssemblyEngine.run(config);
    }

    /**
     * Auto-configure from environment variables and global config.
     */
    private autoConfig(globalConfig?: import('./config/config-manager').GlobalConfig): MonultConfig {
        const config: MonultConfig = { providers: {} };

        // 1. Load from environment first
        if (process.env.ANTHROPIC_API_KEY) {
            config.providers!.claude = { apiKey: process.env.ANTHROPIC_API_KEY };
        }
        if (process.env.OPENAI_API_KEY) {
            config.providers!.openai = { apiKey: process.env.OPENAI_API_KEY };
        }
        if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
            config.providers!.gemini = { apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY };
        }
        if (process.env.COHERE_API_KEY) {
            config.providers!.cohere = { apiKey: process.env.COHERE_API_KEY };
        }
        if (process.env.OLLAMA_HOST || process.env.LOCAL_LLM) {
            config.providers!.local = { baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434' };
        }

        // 2. Merge with global config (~/.monult/config.json)
        if (globalConfig?.providers) {
            for (const [providerName, providerConf] of Object.entries(globalConfig.providers)) {
                // Keep env vars if they exist, otherwise use global config
                if (!config.providers![providerName] && providerConf.apiKey) {
                    config.providers![providerName] = { apiKey: providerConf.apiKey, ...providerConf };
                }
            }
        }

        // 3. Always enable LocalProvider as fallback if no other providers are configured
        if (Object.keys(config.providers || {}).length === 0) {
            config.providers = {
                local: { baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434' }
            };
        }

        return config;
    }

    private registerBuiltInAgents(): void {
        this.agentRegistry.register(new DebuggerAgent(this.sdk, this.memory));
        this.agentRegistry.register(new ArchitectAgent(this.sdk, this.memory));
        this.agentRegistry.register(new SecurityAgent(this.sdk, this.memory));
        this.agentRegistry.register(new DevOpsAgent(this.sdk, this.memory));
        this.agentRegistry.register(new DocsAgent(this.sdk, this.memory));
        this.agentRegistry.register(new FrontendAgent(this.sdk, this.memory));
        this.agentRegistry.register(new BackendAgent(this.sdk, this.memory));
        this.agentRegistry.register(new PerformanceAgent(this.sdk, this.memory));
    }
}

// ── Re-exports ─────────────────────────────────────────────
export { UniversalSDK } from './core/sdk';
export type { MonultConfig } from './core/sdk';
export { AssemblyEngine } from './core/assembly';
export { AgentAssemblyEngine } from './core/agent-assembly';
export { HybridAssemblyEngine } from './core/hybrid-assembly';
export { DebateEngine } from './core/debate';
export { ConsensusEngine } from './core/consensus';
export { SmartRouter } from './core/router';
export { IntentEngine } from './core/intent';
export { VectorStore } from './memory/vector-store';
export { ContextManager } from './memory/context-manager';
export { BaseAgent, AgentRegistry } from './agents';
export { BaseTool } from './tools/base';
export { SecurityEngine } from './security/engine';
export { CostTracker } from './cost/tracker';
export { AssemblyGraph } from './core/assembly-graph';
export { CohereProvider } from './providers/cohere';
export type { GenerateRequest, GenerateResponse, ProviderConfig, TokenUsage, BaseProvider } from './providers/base';
