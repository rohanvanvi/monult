/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Workflow Engine
// ─────────────────────────────────────────────────────────────

import { WorkflowConfig, WorkflowContext, WorkflowResult, WorkflowNode } from './base';
import { Monult } from '../index'; // Use main SDK instance to invoke models/agents

/**
 * Executes multi-step workflows deterministically.
 */
export class WorkflowEngine {
    private monult: Monult; // Reference to main SDK

    constructor(monult: Monult) {
        this.monult = monult;
    }

    /**
     * Run a workflow configuration.
     */
    async run(config: WorkflowConfig, initialInputs: Record<string, any> = {}): Promise<WorkflowResult> {
        const startTime = Date.now();
        const context: WorkflowContext = {
            inputs: initialInputs,
            outputs: {}
        };

        try {
            // Very simple sequential topological execution for MVP 
            // Real-world would use a graph resolver. We assume nodes are given in execution order.
            for (const node of config.nodes) {
                // Determine if dependencies are met
                if (node.dependsOn) {
                    for (const dep of node.dependsOn) {
                        if (!(dep in context.outputs)) {
                            throw new Error(`Node ${node.id} depends on ${dep}, which has not completed or failed.`);
                        }
                    }
                }

                // Execute node
                const output = await this.executeNode(node, context);
                context.outputs[node.id] = output;
            }

            return {
                workflowName: config.name,
                success: true,
                outputs: context.outputs,
                totalLatency: Date.now() - startTime,
            };
        } catch (error) {
            return {
                workflowName: config.name,
                success: false,
                outputs: context.outputs,
                totalLatency: Date.now() - startTime,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    private async executeNode(node: WorkflowNode, context: WorkflowContext): Promise<any> {
        // If it defines a custom resolver, use it
        if (node.execute) {
            return node.execute(context);
        }

        // Parse templated input like "{{step1.output}} or {{inputs.topic}}"
        let templatedInput = node.inputTemplate || '';
        if (templatedInput) {
            templatedInput = templatedInput.replace(/{{\s*(.+?)\s*}}/g, (match, key) => {
                const parts = key.split('.');
                let current: any = { ...context };

                // Allow "inputs.xxx" or "outputs.step1.xxx", fallback to shorthand "step1.output"
                if (parts[0] !== 'inputs' && parts[0] !== 'outputs') {
                    // Shorthand mapper: "step1" means "context.outputs.step1"
                    // If they literally just typed "step1", we'll just inject context.outputs.step1 directly.
                    let ref = context.outputs[parts[0]];
                    if (parts.length > 1) {
                        for (let i = 1; i < parts.length; i++) {
                            ref = ref?.[parts[i]];
                        }
                    } else if (typeof ref === 'object') {
                        // Usually they want the primary text output
                        ref = ref.output || ref.content || ref.consensus || JSON.stringify(ref);
                    }
                    return ref || match;
                }

                for (const p of parts) {
                    if (current === undefined || current === null) break;
                    current = current[p];
                }

                return current !== undefined ? (typeof current === 'object' ? JSON.stringify(current) : current) : match;
            });
        }

        switch (node.action) {
            case 'model':
                const resModel = await this.monult.generate({
                    provider: node.provider || 'auto',
                    model: node.model,
                    systemPrompt: node.systemPrompt,
                    prompt: node.prompt ? node.prompt + (templatedInput ? '\n' + templatedInput : '') : templatedInput
                });
                return { content: resModel.content, usage: resModel.usage };

            case 'agent':
                if (!node.agentName) throw new Error(`Agent node requires 'agentName'`);
                const agent = this.monult.agentRegistry.get(node.agentName);
                if (!agent) throw new Error(`Agent ${node.agentName} not found.`);

                const resAgent = await agent.run({
                    id: `wf-${node.id}-${Date.now()}`,
                    description: node.task || 'Workflow task',
                    input: templatedInput || node.task || ''
                });
                return { output: resAgent.output, success: resAgent.success };

            case 'assembly':
                if (!node.task) throw new Error(`Assembly node requires 'task'`);
                const resAsm = await this.monult.devteam(node.task + (templatedInput ? '\n' + templatedInput : ''));
                return { output: resAsm.consensus || 'DevTeam complete', success: true };

            case 'tool':
                throw new Error('Tool execution directly from workflow MVP is not fully implemented. Wrap in an agent.');

            default:
                throw new Error(`Unknown workflow action type: ${node.action}`);
        }
    }
}
