/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — DevTeam Orchestration Engine
// ─────────────────────────────────────────────────────────────
// Orchestrates real AI development teams that perform
// actual work: create files, write code, execute commands.
// ─────────────────────────────────────────────────────────────

import { AgentRegistry } from '../agents/registry';
import { BaseAgent } from '../agents/base';
import { UniversalSDK } from './sdk';
import { ContextManager } from '../memory/context-manager';
import { ConsensusEngine } from './consensus';
import { CostTracker } from '../cost/tracker';
import * as path from 'path';
import { CreateDirectoryTool, WriteFileTool, AppendFileTool, ReadFileTool, ListFilesTool, DeleteFileTool } from '../tools/filesystem';
import { RunCommandTool } from '../tools/command';

export interface DevTeamConfig {
    task: string;
    workspace?: string;
    agents?: string[];
    enableConsensus?: boolean;
    onProgress?: (event: DevTeamEvent) => void;
}

export interface DevTeamEvent {
    type: 'leader_start' | 'leader_progress' | 'leader_complete' | 'agent_start' | 'agent_progress' | 'agent_complete' | 'file_created' | 'command_executed' | 'consensus_reached' | 'error';
    agent?: string;
    task?: string;
    progress?: string;
    data?: any;
    timestamp: number;
}

export interface AgentTask {
    id: string;
    agent: string;
    task: string;
    workspace: string;
    files?: string[];
    commands?: string[];
}

export interface DevTeamResult {
    id: string;
    task: string;
    workspace: string;
    files: FileResult[];
    commands: CommandResult[];
    consensus?: string;
    totalTokens: number;
    totalCost: number;
    timestamp: number;
}

export interface FileResult {
    path: string;
    content: string;
    agent: string;
    timestamp: number;
}

export interface CommandResult {
    command: string;
    output: string;
    agent: string;
    exitCode: number;
    timestamp: number;
}

/**
 * DevTeam Engine — orchestrates real AI development teams.
 * 
 * Workflow:
 * 1. Leader analyzes task and assigns agents
 * 2. Each agent performs real work (files, commands)
 * 3. Consensus on conflicting approaches
 * 4. Generate actual project in workspace
 */
export class DevTeamEngine {
    private agentRegistry: AgentRegistry;
    private sdk: UniversalSDK;
    private memory: ContextManager;
    private consensusEngine: ConsensusEngine;
    private costTracker: CostTracker;
    private leaderBuffer: string = '';

    constructor(
        agentRegistry: AgentRegistry,
        sdk: UniversalSDK,
        memory: ContextManager,
        costTracker: CostTracker
    ) {
        this.agentRegistry = agentRegistry;
        this.sdk = sdk;
        this.memory = memory;
        this.consensusEngine = new ConsensusEngine();
        this.costTracker = costTracker;
    }

    /**
     * Execute a DevTeam workflow.
     */
    async execute(config: DevTeamConfig): Promise<DevTeamResult> {
        const startTime = Date.now();
        const teamId = `devteam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const workspace = config.workspace || path.join(process.cwd(), 'workspaces', teamId);

        // Create workspace
        const createDirTool = new CreateDirectoryTool(workspace, 'devteam');
        await createDirTool.execute('.');

        config.onProgress?.({
            type: 'leader_start',
            data: { workspace, task: config.task },
            timestamp: Date.now()
        });

        try {
            // Phase 1: Leader analyzes and assigns agents
            const leaderResult = await this.assignLeader(config.task, workspace, config);

            // Phase 2: Execute agents in parallel
            const agentResults = await this.executeAgents(leaderResult.agents, config.task, workspace, config);

            // Phase 3: Consensus if enabled
            let consensus;
            if (config.enableConsensus && agentResults.length > 1) {
                consensus = await this.reachConsensus(agentResults, config);
            }

            // Phase 4: Generate final results
            const result = await this.generateResult(teamId, config.task, workspace, agentResults, consensus);

            config.onProgress?.({
                type: 'consensus_reached',
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            config.onProgress?.({
                type: 'error',
                data: { error: error instanceof Error ? error.message : 'Unknown error' },
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Leader agent analyzes task and assigns team members.
     */
    private async assignLeader(task: string, workspace: string, config: DevTeamConfig) {
        const leaderAgent = this.agentRegistry.get('architect') || this.agentRegistry.list()[0];

        const leaderPrompt = `You are the Team Leader for a development task.

Task: "${task}"

Analyze this task and assign the appropriate development team members.

Available agents:
${this.agentRegistry.list().map(a => `- ${a.name}: ${a.description}`).join('\n')}

Respond with:
1. Brief analysis of the task
2. Required team members (2-4 agents)
3. Suggested approach
4. [DONE] followed by your decision

Example response:
"This task requires building a web application. I need:
- frontend agent for UI development
- backend agent for API development  
- database agent for data modeling
Approach: Use React with Node.js and PostgreSQL [DONE]"`;

        const availableModels = this.getModelsForAgent('architect');
        let result: any;
        let lastError: any;

        for (const selectedModel of availableModels) {
            try {
                result = await this.sdk.generate({
                    prompt: leaderPrompt,
                    model: selectedModel,
                    stream: true,
                    onChunk: (chunk) => {
                        // We no longer emit raw token chunks to the dashboard for DevTeam
                        // to prevent the "word by word" log spam. Tools will emit actual actions.
                    }
                });
                break;
            } catch (err) {
                lastError = err;
            }
        }

        if (!result) {
            throw lastError || new Error("All available models failed for Leader agent");
        }

        const agentNames = this.parseAgentSelection(result.content);
        const agents = this.resolveAgents(agentNames.length > 0 ? agentNames : (config.agents || ['frontend', 'backend', 'database']));

        config.onProgress?.({
            type: 'leader_complete',
            agent: 'leader',
            data: {
                selectedAgents: agents.map(a => a.name),
                analysis: result.content,
                model: 'claude-3-sonnet-20240229'
            },
            timestamp: Date.now()
        });

        return { agents, analysis: result.content };
    }

    /**
     * Execute assigned agents in parallel.
     */
    private async executeAgents(agents: BaseAgent[], task: string, workspace: string, config: DevTeamConfig) {
        const results = await Promise.allSettled(
            agents.map(agent => this.executeAgent(agent, task, workspace, config))
        );

        // Report any agent failures to the dashboard
        for (const result of results) {
            if (result.status === 'rejected') {
                const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
                config.onProgress?.({
                    type: 'error',
                    data: { error: `Agent failed: ${errMsg}` },
                    timestamp: Date.now()
                });
            }
        }

        const fulfilled = results
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value);

        if (fulfilled.length === 0 && agents.length > 0) {
            const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
            throw firstError?.reason || new Error('All agents failed to execute');
        }

        return fulfilled;
    }

    /**
     * Execute a single agent with real work capabilities.
     */
    private async executeAgent(agent: BaseAgent, task: string, workspace: string, config: DevTeamConfig) {
        const agentWorkspace = path.join(workspace, agent.name);
        const createDirTool = new CreateDirectoryTool(workspace, 'devteam');
        await createDirTool.execute(agent.name);

        config.onProgress?.({
            type: 'agent_start',
            agent: agent.name,
            timestamp: Date.now()
        });

        try {
            // Get the queue of available models for this agent
            const availableModels = this.getModelsForAgent(agent.name);
            let lastError: any;
            let result: any;
            let fileResults: FileResult[] = [];
            let commandResults: CommandResult[] = [];
            let attempts = 0;
            const maxAttempts = 3;

            // Register tools for the agent once
            agent.registerTool(new CreateDirectoryTool(agentWorkspace, agent.name, config.onProgress));
            agent.registerTool(new WriteFileTool(agentWorkspace, agent.name, config.onProgress));
            agent.registerTool(new ReadFileTool(agentWorkspace));
            agent.registerTool(new AppendFileTool(agentWorkspace, agent.name, config.onProgress));
            agent.registerTool(new ListFilesTool(agentWorkspace));
            agent.registerTool(new DeleteFileTool(agentWorkspace, agent.name, config.onProgress));
            agent.registerTool(new RunCommandTool(agentWorkspace, agent.name, config.onProgress));

            while (attempts < maxAttempts) {
                try {
                    for (const selectedModel of availableModels) {
                        try {
                            // Enhanced agent task with real work capabilities
                            result = await agent.run({
                                id: `devteam-${agent.name}-${Date.now()}`,
                                model: selectedModel,
                                description: `Execute development task: ${task}`,
                                input: `Task: ${task}
Workspace: ${agentWorkspace}

You are the ${agent.name} agent. Your specialty: ${agent.description}.

**CRITICAL: You have REAL FILE SYSTEM ACCESS via tools. Create a COMPLETE, PRODUCTION-READY project.**

**STEP-BY-STEP INSTRUCTIONS:**

1. **ANALYZE THE TASK** - Understand what type of project is needed (web app, API, CLI tool, etc.)

2. **PLAN THE PROJECT STRUCTURE** - Decide what files and directories are needed

3. **CREATE FILES SYSTEMATICALLY** - Use the create_file tool for EACH file. One file per tool call.

4. **FOLLOW THESE RULES STRICTLY:**
   - Create ALL necessary files for a working project (minimum 5-10 files)
   - Start with package.json (or equivalent config) FIRST
   - Create complete directory structure: src/, public/, components/, pages/, styles/, etc.
   - Every file must contain REAL, COMPLETE code — NO placeholders, NO comments-only files
   - Include: entry points (index.js/tsx), config files, component files, styling, utilities
   - For web projects: create HTML, CSS, JavaScript/TypeScript files
   - For API projects: create server files, route files, model files
   - Do NOT run npm install or npm create — write all files manually
   - Use create_file tool for EACH file. Call it multiple times — one file per tool call
   - After creating all files, respond with [DONE] and a summary of files created

**EXAMPLE FOR A TO-DO APP:**
- package.json (dependencies, scripts)
- index.html (main HTML file)
- styles.css (styling)
- app.js or app.ts (main JavaScript/TypeScript)
- components/ (directory with component files)
- utils/ (utility functions)
- README.md (documentation)

**IMPORTANT:**
- DO NOT create only package.json files
- DO NOT create empty or placeholder files
- DO NOT stop after 1-2 files
- CREATE A COMPLETE, FUNCTIONAL PROJECT
- Use create_file tool for EACH file
- After all files are created, respond with [DONE]

**ADDITIONAL REQUIREMENTS:**
- Create at least 5-10 files for a complete project
- Ensure all files are properly linked and functional
- Create proper file structure and organization
- Include all dependencies and configuration files needed
- Test that the project can run independently`,
                                context: {
                                    workspace: agentWorkspace,
                                    task,
                                    capabilities: ['file_system', 'command_execution']
                                },
                                onProgress: (chunk: string) => {
                                    // Silent — tools handle dashboard events
                                }
                            });

                            // Break out on success
                            break;
                        } catch (err) {
                            lastError = err;
                            result = null; // Re-nullify for the check below
                        }
                    }

                    if (result) {
                        break; // Success, exit retry loop
                    }

                    // If we get here, all models failed for this attempt
                    attempts++;
                    if (attempts >= maxAttempts) {
                        break;
                    }

                    // Wait before retry with exponential backoff
                    const delay = Math.pow(2, attempts) * 1000;
                    config.onProgress?.({
                        type: 'agent_progress',
                        agent: agent.name,
                        task,
                        progress: `Retrying in ${delay/1000}s... (${attempts}/${maxAttempts})`,
                        timestamp: Date.now()
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, delay));

                } catch (error) {
                    lastError = error;
                    attempts++;
                    if (attempts >= maxAttempts) {
                        break;
                    }

                    const delay = Math.pow(2, attempts) * 1000;
                    config.onProgress?.({
                        type: 'agent_progress',
                        agent: agent.name,
                        task,
                        progress: `Retrying in ${delay/1000}s... (${attempts}/${maxAttempts})`,
                        timestamp: Date.now()
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            if (!result) {
                throw lastError || new Error(`Agent ${agent.name} failed after ${maxAttempts} attempts`);
            }

            // Extract tools results instead of Regex parsing
            for (const step of result.steps) {
                if (step.toolName === 'write_file' || step.toolName === 'append_file' || step.toolName === 'create_directory') {
                    if (step.toolResult && step.toolResult.success) {
                        fileResults.push({
                            path: (step.toolResult.data as any).path,
                            content: '', // Agent doesn't echo exact content securely here, so we skip reading it back
                            agent: agent.name,
                            timestamp: step.timestamp
                        });
                    }
                }
                if (step.toolName === 'run_command') {
                    if (step.toolResult && step.toolResult.success) {
                        commandResults.push({
                            command: step.toolInput || '',
                            output: step.toolResult.output,
                            agent: agent.name,
                            exitCode: (step.toolResult.data as any).exitCode || 0,
                            timestamp: step.timestamp
                        });
                    } else if (step.toolResult) {
                        commandResults.push({
                            command: step.toolInput || '',
                            output: step.toolResult.error || 'Execution failed',
                            agent: agent.name,
                            exitCode: -1,
                            timestamp: step.timestamp
                        });
                    }
                }
            }

            config.onProgress?.({
                type: 'agent_complete',
                agent: agent.name,
                data: {
                    output: result.output,
                    files: fileResults.length,
                    commands: commandResults.length
                },
                timestamp: Date.now()
            });

            return {
                agent: agent.name,
                result,
                files: fileResults,
                commands: commandResults
            };

        } catch (error) {
            config.onProgress?.({
                type: 'error',
                agent: agent.name,
                data: { error: error instanceof Error ? error.message : 'Unknown error' },
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Parse agent selection from leader response.
     */
    private parseAgentSelection(content: string): string[] {
        const lines = content.split('\n');
        const agentNames: string[] = [];
        
        // Look for agent assignments in various formats
        for (const line of lines) {
            // Match formats like "- frontend:" or "- backend:" or "frontend agent:"
            const match = line.match(/^\s*-\s*(\w+):/i) || line.match(/(\w+)\s+agent\s*:/i);
            if (match) {
                agentNames.push(match[1].toLowerCase());
            }
        }
        
        return agentNames;
    }

    /**
     * Resolve agents by name.
     */
    private resolveAgents(names: string[]): BaseAgent[] {
        const agents: BaseAgent[] = [];
        for (const name of names) {
            const agent = this.agentRegistry.get(name);
            if (agent) agents.push(agent);
        }
        return agents;
    }

    /**
     * Reach consensus on conflicting approaches.
     */
    private async reachConsensus(agentResults: any[], config: DevTeamConfig): Promise<string> {
        const responses = agentResults.map(result => ({
            id: result.agent,
            content: result.result.output,
            model: this.getModelsForAgent(result.agent)[0],
            provider: `agent:${result.agent}`,
            usage: { promptTokens: 0, completionTokens: result.result.output.length, totalTokens: result.result.output.length },
            latency: 0,
            finishReason: 'stop' as const,
            timestamp: Date.now(),
        }));

        const consensusResult = this.consensusEngine.evaluate(responses);
        return consensusResult.reasoning;
    }

    /**
     * Get a queue of available models for each agent in order of preference.
     */
    private getModelsForAgent(agentName: string): string[] {
        // Get available models from SDK
        const availableModels = this.sdk.listModels();
        
        // If no models are available, return a fallback
        if (availableModels.length === 0) {
            return ['llama3']; // Fallback to a common local model
        }

        // Agent-to-model preferences - prioritize available models
        const agentPreferences: Record<string, string[]> = {
            'architect': ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'],
            'frontend': ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'],
            'backend': ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'],
            'database': ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'],
            'devops': ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'],
            'security': ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'],
            'docs': ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024']
        };

        const preferredModels = agentPreferences[agentName] || ['command-r-plus-08-2024'];

        // Filter out preferred models that aren't actually loaded
        const validModels = preferredModels.filter(pref =>
            availableModels.some(model => model.id === pref || model.provider === pref)
        );

        if (validModels.length > 0) {
            return validModels;
        }

        // Fallback to local models if no preferred models are available
        const localModels = availableModels
            .filter(model => model.provider === 'local')
            .map(m => m.id);
        
        if (localModels.length > 0) {
            return localModels;
        }

        // Final fallback to all available models
        const fallbackModels = availableModels.map(m => m.id);
        return fallbackModels;
    }

    /**
     * Generate final DevTeam result.
     */
    private async generateResult(teamId: string, task: string, workspace: string, agentResults: any[], consensus?: string): Promise<DevTeamResult> {
        const allFiles: FileResult[] = [];
        const allCommands: CommandResult[] = [];
        let totalTokens = 0;

        for (const result of agentResults) {
            allFiles.push(...result.files);
            allCommands.push(...result.commands);
            totalTokens += result.result.output.length; // Rough token estimation
        }

        return {
            id: teamId,
            task,
            workspace,
            files: allFiles,
            commands: allCommands,
            consensus,
            totalTokens,
            totalCost: this.costTracker.estimateCost(totalTokens, 'claude-3-sonnet-20240229'),
            timestamp: Date.now()
        };
    }
}

type LeaderResult = {
    agents: BaseAgent[];
    analysis: string;
};
