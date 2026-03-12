/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Plugin Registry
// ─────────────────────────────────────────────────────────────

import { BasePlugin } from './base';
import { Monult } from '../index';

export class PluginRegistry {
    private plugins: Map<string, BasePlugin> = new Map();
    private monult: Monult;

    constructor(monult: Monult) {
        this.monult = monult;
    }

    /**
     * Register a plugin.
     */
    register(plugin: BasePlugin): void {
        if (this.plugins.has(plugin.name)) {
            console.warn(`Plugin ${plugin.name} is already registered.`);
            return;
        }

        plugin.setup(this.monult);
        this.plugins.set(plugin.name, plugin);
    }

    /**
     * Get a registered plugin by name.
     */
    get(name: string): BasePlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * List all installed plugins.
     */
    list(): Array<{ name: string; version: string; description: string }> {
        return Array.from(this.plugins.values()).map(p => ({
            name: p.name,
            version: p.version,
            description: p.description
        }));
    }

    /**
     * Remove a plugin.
     */
    remove(name: string): boolean {
        const plugin = this.plugins.get(name);
        if (plugin) {
            plugin.teardown(this.monult);
            return this.plugins.delete(name);
        }
        return false;
    }
}
