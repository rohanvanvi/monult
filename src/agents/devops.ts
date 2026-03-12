/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — DevOps Agent
// ─────────────────────────────────────────────────────────────

import { BaseAgent, AgentStep } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';

export class DevOpsAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'devops',
            description: 'Assists with CI/CD, deployment, infrastructure, containerization, and operational tasks.',
            systemPrompt: `You are an expert DevOps engineer. When given infrastructure or deployment tasks:
1. Design CI/CD pipelines
2. Create Docker and Kubernetes configurations
3. Set up monitoring and alerting
4. Optimize build and deployment processes
5. Implement infrastructure as code
Provide production-ready configurations and scripts.`,
        });
    }

    protected async think(context: string, previousSteps: AgentStep[], iteration: number): Promise<AgentStep> {
        if (iteration === 0) {
            const response = await this.sdk.generate({
                provider: this.config.provider,
                prompt: `Provide DevOps guidance for:\n\n${context}\n\nInclude:\n1. Infrastructure recommendations\n2. CI/CD pipeline configuration\n3. Deployment strategy\n4. Monitoring setup\n5. Configuration files (Dockerfile, docker-compose, etc.)\n\nPrefix your final answer with [DONE].`,
                systemPrompt: this.config.systemPrompt,
            });

            return {
                iteration,
                thought: `[DONE] ${response.content}`,
                action: 'FINISH',
                observation: response.content,
                timestamp: Date.now(),
            };
        }

        return super.think(context, previousSteps, iteration);
    }
}
