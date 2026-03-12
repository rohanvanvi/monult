/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Tool Base Interface
// ─────────────────────────────────────────────────────────────

export interface ToolResult {
    output: string;
    success: boolean;
    data?: unknown;
    error?: string;
    latency: number;
}

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    description: string;
    required: boolean;
    default?: unknown;
}

/**
 * Base class for all tools that agents can use.
 */
export abstract class BaseTool {
    readonly name: string;
    readonly description: string;
    readonly parameters: ToolParameter[];

    constructor(name: string, description: string, parameters: ToolParameter[] = []) {
        this.name = name;
        this.description = description;
        this.parameters = parameters;
    }

    abstract execute(input: string): Promise<ToolResult>;

    protected success(output: string, data?: unknown, latency: number = 0): ToolResult {
        return { output, success: true, data, latency };
    }

    protected failure(error: string, latency: number = 0): ToolResult {
        return { output: '', success: false, error, latency };
    }
}
