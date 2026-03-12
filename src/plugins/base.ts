/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Plugin System
// ─────────────────────────────────────────────────────────────

import { Monult } from '../index';

export interface PluginConfig {
    name: string;
    version: string;
    description?: string;
}

export abstract class BasePlugin {
    readonly name: string;
    readonly version: string;
    readonly description: string;

    constructor(config: PluginConfig) {
        this.name = config.name;
        this.version = config.version;
        this.description = config.description || '';
    }

    /**
     * Called when the plugin is registered with Monult.
     */
    abstract setup(monult: Monult): void;

    /**
     * Called when the plugin is removed or the system shuts down.
     */
    abstract teardown(monult: Monult): void;
}
