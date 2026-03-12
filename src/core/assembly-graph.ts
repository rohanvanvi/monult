/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Assembly Graph
// ─────────────────────────────────────────────────────────────
// Visualizes and tracks how models and agents reason through
// a complex prompt to reach consensus.
// ─────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';

export type GraphNodeType = 'prompt' | 'model_proposal' | 'model_critique' | 'agent_proposal' | 'agent_critique' | 'agent_improvement' | 'model_improvement' | 'consensus';

export interface AssemblyGraphNode {
    id: string;
    type: GraphNodeType;
    label: string; // E.g., "User Prompt", "Claude Outline", "Architect Agent Critique"
    content: string;
    metadata?: Record<string, any>;
    timestamp: number;
    latencyMs?: number;
    tokens?: number;
}

export interface AssemblyGraphEdge {
    sourceId: string;
    targetId: string;
    label?: string; // E.g., "critiques", "improves upon", "selects as consensus"
}

/**
 * Tracks the lineage of reasoning across models and agents.
 */
export class AssemblyGraph {
    private readonly nodes: Map<string, AssemblyGraphNode> = new Map();
    private readonly edges: AssemblyGraphEdge[] = [];
    private currentRunId: string | null = null;
    private rootNodeId: string | null = null;

    /**
     * Start tracking a new assembly process.
     */
    startRun(prompt: string): string {
        this.nodes.clear();
        this.edges.length = 0;
        this.currentRunId = uuidv4();

        const rootNode = this.addNode({
            type: 'prompt',
            label: 'User Prompt',
            content: prompt,
        });
        this.rootNodeId = rootNode.id;

        return this.currentRunId;
    }

    /**
     * Add a node to the reasoning graph.
     */
    addNode(data: Omit<AssemblyGraphNode, 'id' | 'timestamp'>): AssemblyGraphNode {
        const id = uuidv4();
        const node: AssemblyGraphNode = {
            ...data,
            id,
            timestamp: Date.now(),
        };
        this.nodes.set(id, node);
        return node;
    }

    /**
     * Connect two nodes (e.g., A critiques B).
     */
    addEdge(sourceId: string, targetId: string, label?: string): void {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            console.warn(`[Graph] Cannot add edge between non-existent nodes: ${sourceId} -> ${targetId}`);
            return;
        }
        this.edges.push({ sourceId, targetId, label });
    }

    /**
     * Get the ID of the root node (the original prompt).
     */
    getRootNodeId(): string | null {
        return this.rootNodeId;
    }

    /**
     * Export the current graph state for visualization.
     */
    exportGraph(): { runId: string | null; nodes: AssemblyGraphNode[]; edges: AssemblyGraphEdge[] } {
        return {
            runId: this.currentRunId,
            nodes: Array.from(this.nodes.values()),
            edges: [...this.edges],
        };
    }

    /**
     * Alias for exportGraph to match API spec.
     */
    exportJSON() {
        return JSON.stringify(this.exportGraph(), null, 2);
    }
}
