/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Vector Store
// ─────────────────────────────────────────────────────────────
// In-memory vector store with cosine similarity search.
// Supports embedding storage and retrieval for the memory system.
// ─────────────────────────────────────────────────────────────

export interface VectorEntry {
    id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
    timestamp: number;
    namespace: string;
}

export interface SearchResult {
    entry: VectorEntry;
    score: number;
    distance: number;
}

export interface VectorStoreConfig {
    dimensions?: number;
    maxEntries?: number;
    defaultNamespace?: string;
}

/**
 * In-memory vector store for semantic search and memory.
 * Uses cosine similarity for nearest-neighbor lookup.
 */
export class VectorStore {
    private entries: Map<string, VectorEntry> = new Map();
    private config: VectorStoreConfig;

    constructor(config: VectorStoreConfig = {}) {
        this.config = {
            dimensions: config.dimensions || 384,
            maxEntries: config.maxEntries || 100000,
            defaultNamespace: config.defaultNamespace || 'default',
        };
    }

    /**
     * Add an entry to the vector store.
     */
    add(content: string, embedding: number[], metadata: Record<string, unknown> = {}, namespace?: string): VectorEntry {
        const entry: VectorEntry = {
            id: `vec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            content,
            embedding,
            metadata,
            timestamp: Date.now(),
            namespace: namespace || this.config.defaultNamespace || 'default',
        };

        // Enforce max entries
        if (this.entries.size >= (this.config.maxEntries || 100000)) {
            const oldest = [...this.entries.values()].sort((a, b) => a.timestamp - b.timestamp)[0];
            if (oldest) this.entries.delete(oldest.id);
        }

        this.entries.set(entry.id, entry);
        return entry;
    }

    /**
     * Search for similar entries using cosine similarity.
     */
    search(queryEmbedding: number[], topK: number = 5, namespace?: string): SearchResult[] {
        const ns = namespace || this.config.defaultNamespace || 'default';
        const results: SearchResult[] = [];

        for (const entry of this.entries.values()) {
            if (entry.namespace !== ns && namespace) continue;

            const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
            results.push({
                entry,
                score: similarity,
                distance: 1 - similarity,
            });
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }

    /**
     * Generate a simple text embedding (bag-of-words hash).
     * In production, use a proper embedding model.
     */
    embed(text: string): number[] {
        const dims = this.config.dimensions || 384;
        const embedding = new Array(dims).fill(0);
        const words = text.toLowerCase().split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            let hash = 0;
            for (let j = 0; j < word.length; j++) {
                hash = ((hash << 5) - hash + word.charCodeAt(j)) | 0;
            }
            const index = Math.abs(hash) % dims;
            embedding[index] += 1;
            // Bigram features
            if (i > 0) {
                const bigram = words[i - 1] + '_' + word;
                let bigramHash = 0;
                for (let j = 0; j < bigram.length; j++) {
                    bigramHash = ((bigramHash << 5) - bigramHash + bigram.charCodeAt(j)) | 0;
                }
                embedding[Math.abs(bigramHash) % dims] += 0.5;
            }
        }

        // L2 normalize
        const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < dims; i++) {
                embedding[i] /= norm;
            }
        }

        return embedding;
    }

    /**
     * Get an entry by ID.
     */
    get(id: string): VectorEntry | undefined {
        return this.entries.get(id);
    }

    /**
     * Delete an entry.
     */
    delete(id: string): boolean {
        return this.entries.delete(id);
    }

    /**
     * Clear all entries in a namespace.
     */
    clearNamespace(namespace: string): number {
        let count = 0;
        for (const [id, entry] of this.entries) {
            if (entry.namespace === namespace) {
                this.entries.delete(id);
                count++;
            }
        }
        return count;
    }

    /**
     * Get store statistics.
     */
    stats(): { totalEntries: number; namespaces: Record<string, number> } {
        const namespaces: Record<string, number> = {};
        for (const entry of this.entries.values()) {
            namespaces[entry.namespace] = (namespaces[entry.namespace] || 0) + 1;
        }
        return { totalEntries: this.entries.size, namespaces };
    }

    /**
     * Export all entries for persistence.
     */
    export(): VectorEntry[] {
        return [...this.entries.values()];
    }

    /**
     * Import entries from a previous export.
     */
    import(entries: VectorEntry[]): void {
        for (const entry of entries) {
            this.entries.set(entry.id, entry);
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        const len = Math.min(a.length, b.length);
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < len; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
    }
}
