/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Intent Engine
// ─────────────────────────────────────────────────────────────
// Detects developer intent from natural language to route
// requests to appropriate tools, agents, or workflows.
// ─────────────────────────────────────────────────────────────

export type IntentCategory =
    | 'generate'
    | 'debug'
    | 'analyze'
    | 'explain'
    | 'refactor'
    | 'test'
    | 'document'
    | 'deploy'
    | 'security'
    | 'search'
    | 'chat'
    | 'unknown';

export interface DetectedIntent {
    category: IntentCategory;
    confidence: number;
    suggestedAgent?: string;
    suggestedTools?: string[];
    entities: ExtractedEntity[];
    rawInput: string;
}

export interface ExtractedEntity {
    type: 'file' | 'language' | 'framework' | 'concept' | 'action' | 'target';
    value: string;
    position: number;
}

interface IntentPattern {
    category: IntentCategory;
    patterns: RegExp[];
    agent?: string;
    tools?: string[];
}

/**
 * Intent Engine — understands what the developer wants to do.
 */
export class IntentEngine {
    private patterns: IntentPattern[];

    constructor() {
        this.patterns = this.initPatterns();
    }

    /**
     * Detect intent from a natural language input.
     */
    detect(input: string): DetectedIntent {
        const lower = input.toLowerCase().trim();
        let bestMatch: { pattern: IntentPattern; confidence: number } | null = null;

        for (const pattern of this.patterns) {
            const matches = pattern.patterns.filter(p => p.test(lower)).length;
            const confidence = matches / pattern.patterns.length;

            if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
                bestMatch = { pattern, confidence: Math.min(confidence * 1.5, 1) };
            }
        }

        const entities = this.extractEntities(input);

        if (bestMatch) {
            return {
                category: bestMatch.pattern.category,
                confidence: bestMatch.confidence,
                suggestedAgent: bestMatch.pattern.agent,
                suggestedTools: bestMatch.pattern.tools,
                entities,
                rawInput: input,
            };
        }

        return {
            category: 'chat',
            confidence: 0.3,
            entities,
            rawInput: input,
        };
    }

    /**
     * Extract entities (files, languages, frameworks) from input.
     */
    private extractEntities(input: string): ExtractedEntity[] {
        const entities: ExtractedEntity[] = [];

        // File paths
        const filePaths = input.match(/[\w./\\-]+\.\w{1,10}/g);
        if (filePaths) {
            filePaths.forEach(fp => {
                entities.push({ type: 'file', value: fp, position: input.indexOf(fp) });
            });
        }

        // Programming languages
        const languages = ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c++', 'ruby', 'php', 'swift', 'kotlin'];
        for (const lang of languages) {
            if (input.toLowerCase().includes(lang)) {
                entities.push({ type: 'language', value: lang, position: input.toLowerCase().indexOf(lang) });
            }
        }

        // Frameworks
        const frameworks = ['react', 'vue', 'angular', 'next.js', 'express', 'fastapi', 'django', 'flask', 'spring', 'rails'];
        for (const fw of frameworks) {
            if (input.toLowerCase().includes(fw)) {
                entities.push({ type: 'framework', value: fw, position: input.toLowerCase().indexOf(fw) });
            }
        }

        return entities;
    }

    private initPatterns(): IntentPattern[] {
        return [
            {
                category: 'generate',
                patterns: [
                    /\b(generate|create|write|build|make|implement)\b/i,
                    /\b(code|function|class|component|module|api)\b/i,
                    /\b(new|from scratch|boilerplate)\b/i,
                ],
                agent: 'architect',
                tools: ['code-analyzer'],
            },
            {
                category: 'debug',
                patterns: [
                    /\b(debug|fix|error|bug|issue|broken|crash|fail)\b/i,
                    /\b(not working|doesn't work|won't|can't)\b/i,
                    /\b(stack trace|exception|traceback)\b/i,
                ],
                agent: 'debugger',
                tools: ['code-analyzer'],
            },
            {
                category: 'analyze',
                patterns: [
                    /\b(analyze|review|assess|evaluate|audit|inspect)\b/i,
                    /\b(performance|quality|complexity|coverage)\b/i,
                    /\b(code review|pull request|pr)\b/i,
                ],
                agent: 'architect',
                tools: ['code-analyzer', 'repo-reader'],
            },
            {
                category: 'explain',
                patterns: [
                    /\b(explain|what is|how does|why|understand|describe)\b/i,
                    /\b(concept|architecture|pattern|design)\b/i,
                    /\b(learn|teach|tutorial)\b/i,
                ],
                tools: ['doc-parser'],
            },
            {
                category: 'refactor',
                patterns: [
                    /\b(refactor|improve|optimize|clean|simplify|restructure)\b/i,
                    /\b(performance|readability|maintainability)\b/i,
                    /\b(better|cleaner|faster|modern)\b/i,
                ],
                agent: 'architect',
                tools: ['code-analyzer'],
            },
            {
                category: 'test',
                patterns: [
                    /\b(test|testing|spec|unit test|integration test)\b/i,
                    /\b(coverage|assertion|mock|stub)\b/i,
                    /\b(tdd|bdd|jest|mocha|pytest)\b/i,
                ],
                tools: ['code-analyzer'],
            },
            {
                category: 'document',
                patterns: [
                    /\b(document|documentation|readme|jsdoc|docstring)\b/i,
                    /\b(api docs|reference|guide|tutorial)\b/i,
                    /\b(comment|annotate)\b/i,
                ],
                agent: 'docs',
                tools: ['doc-parser', 'code-analyzer'],
            },
            {
                category: 'deploy',
                patterns: [
                    /\b(deploy|deployment|ci\/cd|pipeline|docker|kubernetes)\b/i,
                    /\b(production|staging|release|publish)\b/i,
                    /\b(aws|gcp|azure|vercel|netlify)\b/i,
                ],
                agent: 'devops',
            },
            {
                category: 'security',
                patterns: [
                    /\b(security|secure|vulnerability|exploit|attack)\b/i,
                    /\b(auth|permission|access|encryption|inject)\b/i,
                    /\b(owasp|cve|penetration|pentest)\b/i,
                ],
                agent: 'security',
                tools: ['code-analyzer'],
            },
            {
                category: 'search',
                patterns: [
                    /\b(search|find|look for|where|locate)\b/i,
                    /\b(file|function|class|definition|usage)\b/i,
                    /\b(grep|ripgrep|ag)\b/i,
                ],
                tools: ['repo-reader', 'web-search'],
            },
        ];
    }
}
