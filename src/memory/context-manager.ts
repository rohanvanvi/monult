/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Context Manager
// ─────────────────────────────────────────────────────────────
// Multi-layer memory management:
// conversation, project, tool, and knowledge memory.
// ─────────────────────────────────────────────────────────────

import { VectorStore } from './vector-store';

export interface MemoryEntry {
    id: string;
    layer: MemoryLayer;
    key: string;
    value: string;
    metadata: Record<string, unknown>;
    timestamp: number;
    ttl?: number;
}

export type MemoryLayer = 'conversation' | 'project' | 'tool' | 'knowledge';

export interface ContextWindow {
    messages: Array<{ role: string; content: string; timestamp: number }>;
    relevantMemories: MemoryEntry[];
    projectContext: Record<string, unknown>;
    maxTokens: number;
}

/**
 * Context Manager — manages multi-layer persistent memory.
 *
 * Layers:
 * - **conversation**: Short-term chat history
 * - **project**: Project structure, files, dependencies
 * - **tool**: Tool execution results and patterns
 * - **knowledge**: Long-term learned facts and documentation
 */
export class ContextManager {
    private vectorStore: VectorStore;
    private memories: Map<string, MemoryEntry> = new Map();
    private conversations: Map<string, Array<{ role: string; content: string; timestamp: number }>> = new Map();

    constructor(vectorStore?: VectorStore) {
        this.vectorStore = vectorStore || new VectorStore();
    }

    /**
     * Store a memory entry.
     */
    store(layer: MemoryLayer, key: string, value: string, metadata: Record<string, unknown> = {}): MemoryEntry {
        const entry: MemoryEntry = {
            id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            layer,
            key,
            value,
            metadata,
            timestamp: Date.now(),
        };

        this.memories.set(entry.id, entry);

        // Also add to vector store for semantic search
        const embedding = this.vectorStore.embed(value);
        this.vectorStore.add(value, embedding, { ...metadata, layer, key, memoryId: entry.id }, layer);

        return entry;
    }

    /**
     * Search memory using vector embeddings (alias for recall).
     */
    search(query: string, layer?: MemoryLayer, topK: number = 5): MemoryEntry[] {
        return this.recall(query, layer, topK);
    }

    /**
     * Recall memories relevant to a query.
     */
    recall(query: string, layer?: MemoryLayer, topK: number = 5): MemoryEntry[] {
        const embedding = this.vectorStore.embed(query);
        const results = this.vectorStore.search(embedding, topK, layer);

        return results.map(r => {
            const memoryId = r.entry.metadata.memoryId as string;
            return this.memories.get(memoryId) || {
                id: r.entry.id,
                layer: (r.entry.metadata.layer as MemoryLayer) || 'knowledge',
                key: (r.entry.metadata.key as string) || '',
                value: r.entry.content,
                metadata: r.entry.metadata,
                timestamp: r.entry.timestamp,
            };
        });
    }

    /**
     * Add a message to conversation memory.
     */
    addMessage(conversationId: string, role: string, content: string): void {
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, []);
        }
        this.conversations.get(conversationId)!.push({
            role,
            content,
            timestamp: Date.now(),
        });

        // Store in memory system
        this.store('conversation', `${conversationId}:${role}`, content, {
            conversationId,
            role,
        });
    }

    /**
     * Get conversation history.
     */
    getConversation(conversationId: string, lastN?: number): Array<{ role: string; content: string; timestamp: number }> {
        const messages = this.conversations.get(conversationId) || [];
        return lastN ? messages.slice(-lastN) : messages;
    }

    /**
     * Build a context window for a request.
     */
    buildContext(query: string, conversationId?: string, maxTokens: number = 8000): ContextWindow {
        const messages = conversationId ? this.getConversation(conversationId, 20) : [];
        const relevantMemories = this.recall(query, undefined, 10);

        // Gather project context
        const projectMemories = this.recall(query, 'project', 5);
        const projectContext: Record<string, unknown> = {};
        for (const mem of projectMemories) {
            projectContext[mem.key] = mem.value;
        }

        return {
            messages,
            relevantMemories,
            projectContext,
            maxTokens,
        };
    }

    /**
     * Store project context (file structure, dependencies, etc.).
     */
    storeProjectContext(key: string, value: string, metadata: Record<string, unknown> = {}): MemoryEntry {
        return this.store('project', key, value, metadata);
    }

    /**
     * Store tool execution result.
     */
    storeToolResult(toolName: string, input: string, output: string): MemoryEntry {
        return this.store('tool', `${toolName}:${Date.now()}`, output, {
            toolName,
            input,
        });
    }

    /**
     * Store knowledge entry.
     */
    storeKnowledge(topic: string, content: string, source?: string): MemoryEntry {
        return this.store('knowledge', topic, content, { source });
    }

    /**
     * Get memory statistics.
     */
    stats(): {
        totalMemories: number;
        byLayer: Record<MemoryLayer, number>;
        conversations: number;
        vectorStore: { totalEntries: number; namespaces: Record<string, number> };
    } {
        const byLayer: Record<MemoryLayer, number> = {
            conversation: 0,
            project: 0,
            tool: 0,
            knowledge: 0,
        };

        for (const mem of this.memories.values()) {
            byLayer[mem.layer]++;
        }

        return {
            totalMemories: this.memories.size,
            byLayer,
            conversations: this.conversations.size,
            vectorStore: this.vectorStore.stats(),
        };
    }

    /**
     * Clear all memories in a specific layer.
     */
    clearLayer(layer: MemoryLayer): number {
        let count = 0;
        for (const [id, entry] of this.memories) {
            if (entry.layer === layer) {
                this.memories.delete(id);
                count++;
            }
        }
        this.vectorStore.clearNamespace(layer);
        return count;
    }
}
