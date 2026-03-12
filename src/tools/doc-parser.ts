/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Documentation Parser Tool
// ─────────────────────────────────────────────────────────────

import { BaseTool, ToolResult } from './base';
import * as fs from 'fs';
import * as path from 'path';

export class DocParserTool extends BaseTool {
    constructor() {
        super('doc-parser', 'Parses and extracts information from documentation files (Markdown, JSDoc, docstrings).', [
            { name: 'path', type: 'string', description: 'Path to documentation file or directory', required: true },
        ]);
    }

    async execute(input: string): Promise<ToolResult> {
        const startTime = Date.now();
        const docPath = input.trim();

        try {
            if (!fs.existsSync(docPath)) {
                return this.failure(`Path not found: ${docPath}`, Date.now() - startTime);
            }

            const stat = fs.statSync(docPath);
            if (stat.isDirectory()) {
                return this.parseDirectory(docPath, startTime);
            } else {
                return this.parseFile(docPath, startTime);
            }
        } catch (error) {
            return this.failure(`Error parsing docs: ${error instanceof Error ? error.message : 'Unknown'}`, Date.now() - startTime);
        }
    }

    private parseFile(filePath: string, startTime: number): ToolResult {
        const content = fs.readFileSync(filePath, 'utf-8');
        const ext = path.extname(filePath);

        if (['.md', '.mdx'].includes(ext)) {
            return this.parseMarkdown(filePath, content, startTime);
        }

        // Parse code files for JSDoc/docstrings
        return this.parseCodeDocs(filePath, content, ext, startTime);
    }

    private parseMarkdown(filePath: string, content: string, startTime: number): ToolResult {
        const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
        const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
        const links = content.match(/\[.+?\]\(.+?\)/g) || [];

        const output = [
            `📝 Document: ${path.basename(filePath)}`,
            `   Headings: ${headings.length} | Code blocks: ${codeBlocks.length} | Links: ${links.length}`,
            '',
            '── Table of Contents ──',
            ...headings.map(h => {
                const level = (h.match(/^#+/) || [''])[0].length;
                return `${'  '.repeat(level - 1)}${h.replace(/^#+\s*/, '')}`;
            }),
        ].join('\n');

        return this.success(output, { headings, codeBlocks: codeBlocks.length, links: links.length }, Date.now() - startTime);
    }

    private parseCodeDocs(filePath: string, content: string, ext: string, startTime: number): ToolResult {
        const jsdocComments = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
        const docstrings = content.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g) || [];

        const docs = [...jsdocComments, ...docstrings];
        const output = [
            `📝 Code Docs: ${path.basename(filePath)}`,
            `   Found ${docs.length} documentation blocks`,
            '',
            ...docs.slice(0, 5).map((d, i) => `── Doc ${i + 1} ──\n${d.slice(0, 200)}${d.length > 200 ? '...' : ''}`),
        ].join('\n');

        return this.success(output, { docBlocks: docs.length }, Date.now() - startTime);
    }

    private parseDirectory(dirPath: string, startTime: number): ToolResult {
        const docFiles: string[] = [];
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile() && ['.md', '.mdx', '.rst', '.txt'].includes(path.extname(entry.name))) {
                docFiles.push(entry.name);
            }
        }

        const output = [
            `📁 Documentation Directory: ${path.basename(dirPath)}`,
            `   Found ${docFiles.length} documentation files:`,
            ...docFiles.map(f => `   📝 ${f}`),
        ].join('\n');

        return this.success(output, { files: docFiles }, Date.now() - startTime);
    }
}
