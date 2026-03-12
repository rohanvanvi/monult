/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Agent Registry
// ─────────────────────────────────────────────────────────────

import { BaseAgent } from './base';

/**
 * Registry for discovering and managing agents.
 */
export class AgentRegistry {
    private agents: Map<string, BaseAgent> = new Map();

    register(agent: BaseAgent): void {
        this.agents.set(agent.name, agent);
    }

    get(name: string): BaseAgent | undefined {
        return this.agents.get(name);
    }

    list(): Array<{ name: string; description: string; tools: string[] }> {
        return [...this.agents.values()].map(a => a.info());
    }

    has(name: string): boolean {
        return this.agents.has(name);
    }

    remove(name: string): boolean {
        return this.agents.delete(name);
    }

    count(): number {
        return this.agents.size;
    }
}
