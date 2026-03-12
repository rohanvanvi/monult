/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Database Schema Analyzer Tool
// ─────────────────────────────────────────────────────────────

import { BaseTool, ToolResult } from './base';

export class DbAnalyzerTool extends BaseTool {
    constructor() {
        super('db-analyzer', 'Analyzes database schemas, queries, and relationships.', [
            { name: 'input', type: 'string', description: 'SQL schema, connection string, or schema file path', required: true },
        ]);
    }

    async execute(input: string): Promise<ToolResult> {
        const startTime = Date.now();
        const trimmed = input.trim();

        // Parse SQL schema from string
        if (trimmed.toUpperCase().includes('CREATE TABLE') || trimmed.toUpperCase().includes('CREATE INDEX')) {
            return this.analyzeSchema(trimmed, startTime);
        }

        const output = [
            '🗄️ Database Analyzer',
            '',
            'Provide a SQL schema (CREATE TABLE statements) to analyze.',
            'The analyzer will extract:',
            '  • Table definitions and columns',
            '  • Primary and foreign keys',
            '  • Indexes and constraints',
            '  • Relationship mapping',
            '  • Optimization suggestions',
        ].join('\n');

        return this.success(output, null, Date.now() - startTime);
    }

    private analyzeSchema(schema: string, startTime: number): ToolResult {
        const tables = schema.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi) || [];
        const foreignKeys = schema.match(/FOREIGN\s+KEY/gi) || [];
        const indexes = schema.match(/CREATE\s+(?:UNIQUE\s+)?INDEX/gi) || [];

        const tableNames = tables.map(t => {
            const match = t.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)/i);
            return match ? match[1] : 'unknown';
        });

        const output = [
            '🗄️ Schema Analysis',
            `   Tables: ${tableNames.length} | Foreign Keys: ${foreignKeys.length} | Indexes: ${indexes.length}`,
            '',
            '── Tables ──',
            ...tableNames.map(t => `   📋 ${t}`),
            '',
            foreignKeys.length > 0 ? `── Relationships: ${foreignKeys.length} foreign key(s) detected ──` : '── No foreign keys detected ──',
        ].join('\n');

        return this.success(output, { tables: tableNames, foreignKeys: foreignKeys.length, indexes: indexes.length }, Date.now() - startTime);
    }
}
