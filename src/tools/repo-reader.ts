/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Repository Reader Tool
// ─────────────────────────────────────────────────────────────

import { BaseTool, ToolResult } from './base';
import * as fs from 'fs';
import * as path from 'path';

export class RepoReaderTool extends BaseTool {
    constructor() {
        super('repo-reader', 'Reads and analyzes repository structure, files, and dependencies.', [
            { name: 'path', type: 'string', description: 'Repository root path', required: true },
        ]);
    }

    async execute(input: string): Promise<ToolResult> {
        const startTime = Date.now();
        const repoPath = input.trim();

        try {
            if (!fs.existsSync(repoPath)) {
                return this.failure(`Repository path not found: ${repoPath}`, Date.now() - startTime);
            }

            const structure = this.readStructure(repoPath);
            const packageInfo = this.readPackageInfo(repoPath);
            const gitInfo = this.readGitInfo(repoPath);

            const output = [
                `📂 Repository: ${path.basename(repoPath)}`,
                '',
                '── Structure ──',
                ...structure.map(s => `  ${s}`),
                '',
                packageInfo ? `── Package ──\n  Name: ${packageInfo.name}\n  Version: ${packageInfo.version}\n  Dependencies: ${packageInfo.depCount}` : '',
                gitInfo ? `\n── Git ──\n  ${gitInfo}` : '',
            ].filter(Boolean).join('\n');

            return this.success(output, { structure, packageInfo, gitInfo }, Date.now() - startTime);
        } catch (error) {
            return this.failure(`Error reading repository: ${error instanceof Error ? error.message : 'Unknown'}`, Date.now() - startTime);
        }
    }

    private readStructure(dir: string, prefix: string = '', depth: number = 0, maxDepth: number = 3): string[] {
        if (depth >= maxDepth) return [`${prefix}...`];
        const lines: string[] = [];

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true })
                .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== '__pycache__')
                .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1));

            for (const entry of entries.slice(0, 20)) {
                const icon = entry.isDirectory() ? '📁' : '📄';
                lines.push(`${prefix}${icon} ${entry.name}`);
                if (entry.isDirectory()) {
                    lines.push(...this.readStructure(path.join(dir, entry.name), prefix + '  ', depth + 1, maxDepth));
                }
            }
            if (entries.length > 20) lines.push(`${prefix}... and ${entries.length - 20} more`);
        } catch { /* skip */ }

        return lines;
    }

    private readPackageInfo(repoPath: string): { name: string; version: string; depCount: number } | null {
        const pkgPath = path.join(repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            return {
                name: pkg.name || 'unknown',
                version: pkg.version || '0.0.0',
                depCount: Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length,
            };
        } catch { return null; }
    }

    private readGitInfo(repoPath: string): string | null {
        const gitDir = path.join(repoPath, '.git');
        if (!fs.existsSync(gitDir)) return null;
        return 'Git repository detected';
    }
}
