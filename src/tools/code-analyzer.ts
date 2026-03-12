/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Code Analyzer Tool
// ─────────────────────────────────────────────────────────────

import { BaseTool, ToolResult } from './base';
import * as fs from 'fs';
import * as path from 'path';

export class CodeAnalyzerTool extends BaseTool {
    constructor() {
        super('code-analyzer', 'Analyzes code files for complexity, patterns, dependencies, and potential issues.', [
            { name: 'target', type: 'string', description: 'File or directory path to analyze', required: true },
        ]);
    }

    async execute(input: string): Promise<ToolResult> {
        const startTime = Date.now();
        const targetPath = input.trim();

        try {
            const stat = fs.statSync(targetPath);
            if (stat.isDirectory()) {
                return this.analyzeDirectory(targetPath, startTime);
            } else {
                return this.analyzeFile(targetPath, startTime);
            }
        } catch (error) {
            return this.failure(`Cannot access path: ${targetPath}. ${error instanceof Error ? error.message : ''}`, Date.now() - startTime);
        }
    }

    private analyzeFile(filePath: string, startTime: number): ToolResult {
        const content = fs.readFileSync(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const lines = content.split('\n');

        const analysis = {
            file: path.basename(filePath),
            extension: ext,
            lines: lines.length,
            characters: content.length,
            blankLines: lines.filter(l => l.trim() === '').length,
            commentLines: this.countComments(lines, ext),
            functions: this.countFunctions(content, ext),
            classes: this.countClasses(content, ext),
            imports: this.countImports(content, ext),
            complexity: this.estimateComplexity(content),
            issues: this.detectIssues(content, ext),
        };

        const output = [
            `📄 File Analysis: ${analysis.file}`,
            `   Lines: ${analysis.lines} | Functions: ${analysis.functions} | Classes: ${analysis.classes}`,
            `   Imports: ${analysis.imports} | Comments: ${analysis.commentLines} | Blank: ${analysis.blankLines}`,
            `   Complexity: ${analysis.complexity}/10`,
            analysis.issues.length > 0 ? `   Issues: ${analysis.issues.join(', ')}` : '   No issues detected.',
        ].join('\n');

        return this.success(output, analysis, Date.now() - startTime);
    }

    private analyzeDirectory(dirPath: string, startTime: number): ToolResult {
        const files = this.walkDir(dirPath);
        const byExtension: Record<string, number> = {};
        let totalLines = 0;

        for (const file of files) {
            const ext = path.extname(file);
            byExtension[ext] = (byExtension[ext] || 0) + 1;
            try {
                const content = fs.readFileSync(file, 'utf-8');
                totalLines += content.split('\n').length;
            } catch { /* skip unreadable files */ }
        }

        const output = [
            `📁 Directory Analysis: ${path.basename(dirPath)}`,
            `   Total files: ${files.length} | Total lines: ${totalLines}`,
            `   File types: ${Object.entries(byExtension).map(([ext, count]) => `${ext || 'no-ext'}(${count})`).join(', ')}`,
        ].join('\n');

        return this.success(output, { files: files.length, totalLines, byExtension }, Date.now() - startTime);
    }

    private countFunctions(content: string, ext: string): number {
        if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
            return (content.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\(|(?:async\s+)?\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{)/g) || []).length;
        }
        if (ext === '.py') {
            return (content.match(/def\s+\w+/g) || []).length;
        }
        return 0;
    }

    private countClasses(content: string, ext: string): number {
        return (content.match(/class\s+\w+/g) || []).length;
    }

    private countImports(content: string, ext: string): number {
        if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
            return (content.match(/(?:import|require)\s/g) || []).length;
        }
        if (ext === '.py') {
            return (content.match(/(?:import|from)\s/g) || []).length;
        }
        return 0;
    }

    private countComments(lines: string[], ext: string): number {
        return lines.filter(l => {
            const trimmed = l.trim();
            return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*');
        }).length;
    }

    private estimateComplexity(content: string): number {
        let score = 0;
        score += (content.match(/if\s*\(/g) || []).length * 0.5;
        score += (content.match(/for\s*\(/g) || []).length * 0.7;
        score += (content.match(/while\s*\(/g) || []).length * 0.7;
        score += (content.match(/switch\s*\(/g) || []).length * 0.8;
        score += (content.match(/try\s*\{/g) || []).length * 0.3;
        score += (content.match(/\?\s*/g) || []).length * 0.2;
        return Math.min(10, Math.round(score));
    }

    private detectIssues(content: string, ext: string): string[] {
        const issues: string[] = [];
        if (content.includes('TODO')) issues.push('Contains TODOs');
        if (content.includes('HACK')) issues.push('Contains HACKs');
        if (content.includes('console.log') && ext !== '.test.ts') issues.push('Contains console.log');
        if (content.length > 50000) issues.push('File too large');
        if (content.includes('any') && ['.ts', '.tsx'].includes(ext)) issues.push('Uses "any" type');
        return issues;
    }

    private walkDir(dir: string, maxDepth: number = 5, depth: number = 0): string[] {
        if (depth >= maxDepth) return [];
        const files: string[] = [];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...this.walkDir(fullPath, maxDepth, depth + 1));
                } else {
                    files.push(fullPath);
                }
            }
        } catch { /* skip unreadable dirs */ }
        return files;
    }
}
