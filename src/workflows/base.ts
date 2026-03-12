/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Workflow Definitions
// ─────────────────────────────────────────────────────────────

export interface WorkflowNode {
    id: string;
    action: 'model' | 'agent' | 'tool' | 'assembly' | 'custom';
    dependsOn?: string[]; // IDs of nodes that must complete before this one

    // Configuration for the action
    provider?: string;
    model?: string;
    agentName?: string;
    toolName?: string;
    prompt?: string;
    task?: string;
    systemPrompt?: string;
    inputTemplate?: string; // Allows injecting outputs from previous nodes via {{nodeId.output}}

    // Custom executor
    execute?: (context: WorkflowContext) => Promise<any>;
}

export interface WorkflowConfig {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
}

export interface WorkflowContext {
    inputs: Record<string, any>;
    outputs: Record<string, any>; // Stores outputs by node id
}

export interface WorkflowResult {
    workflowName: string;
    success: boolean;
    outputs: Record<string, any>;
    totalLatency: number;
    error?: Error;
}
