/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Tool — Repo Analyzer
// ─────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { BaseTool, ToolResult } from './base';

export class RepoAnalyzerTool extends BaseTool {
    name = 'analyze_repo';
    description = 'Analyzes a repository to detect frameworks, databases, auth systems, and architecture patterns.';
    version = '1.0.0';

    async execute(input: string): Promise<ToolResult> {
        return {
            success: false,
            output: 'Use the static analyze() method for direct repository analysis.',
            latency: 0,
        };
    }

    /**
     * Statically analyze a local directory to detect stack information.
     */
    static analyze(dirPath: string, maxDepth: number = 3): {
        frameworks: string[];
        databases: string[];
        auth: string[];
        architecture: string[];
        suggestions: string[];
    } {
        const absolutePath = path.resolve(dirPath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Directory not found: ${absolutePath}`);
        }

        const files = this.walkDir(absolutePath, maxDepth);
        const packageJson = this.readJsonSafe(path.join(absolutePath, 'package.json'));

        const frameworks = this.detectFrameworks(files, packageJson);
        const databases = this.detectDatabases(files, packageJson);
        const auth = this.detectAuth(files, packageJson);
        const architecture = this.detectArchitecture(files);

        const suggestions = this.generateSuggestions(frameworks, databases, auth, architecture);

        return { frameworks, databases, auth, architecture, suggestions };
    }

    private static walkDir(dir: string, maxDepth: number, currentDepth: number = 0): string[] {
        if (currentDepth > maxDepth) return [];
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
            if (file === 'node_modules' || file === '.git' || file === 'dist') continue;

            const fullPath = path.resolve(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
                results = results.concat(this.walkDir(fullPath, maxDepth, currentDepth + 1));
            } else {
                results.push(fullPath);
            }
        }
        return results;
    }

    private static readJsonSafe(filePath: string): any {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch { /* ignore */ }
        return null;
    }

    private static detectFrameworks(files: string[], packageJson: any): string[] {
        const found = new Set<string>();
        const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };

        if (deps['next']) found.add('Next.js');
        if (deps['react']) found.add('React');
        if (deps['vue']) found.add('Vue');
        if (deps['@angular/core']) found.add('Angular');
        if (deps['express']) found.add('Express');
        if (deps['nestjs']) found.add('NestJS');
        if (deps['fastify']) found.add('Fastify');

        files.forEach(f => {
            if (f.endsWith('next.config.js') || f.endsWith('next.config.mjs')) found.add('Next.js');
            if (f.endsWith('vite.config.ts') || f.endsWith('vite.config.js')) found.add('Vite');
            if (f.endsWith('svelte.config.js')) found.add('SvelteKit');
            if (f.endsWith('nuxt.config.ts')) found.add('Nuxt');
        });

        return Array.from(found);
    }

    private static detectDatabases(files: string[], packageJson: any): string[] {
        const found = new Set<string>();
        const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };

        if (deps['pg'] || deps['postgres']) found.add('PostgreSQL');
        if (deps['mysql'] || deps['mysql2']) found.add('MySQL');
        if (deps['sqlite3']) found.add('SQLite');
        if (deps['mongodb'] || deps['mongoose']) found.add('MongoDB');
        if (deps['redis'] || deps['ioredis']) found.add('Redis');
        if (deps['prisma'] || deps['@prisma/client']) found.add('Prisma ORM');
        if (deps['typeorm']) found.add('TypeORM');
        if (deps['drizzle-orm']) found.add('Drizzle ORM');

        files.forEach(f => {
            if (f.includes('prisma/schema.prisma')) found.add('Prisma ORM');
        });

        return Array.from(found);
    }

    private static detectAuth(files: string[], packageJson: any): string[] {
        const found = new Set<string>();
        const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };

        if (deps['next-auth']) found.add('NextAuth.js');
        if (deps['passport']) found.add('Passport.js');
        if (deps['jsonwebtoken'] || deps['jose']) found.add('JWT');
        if (deps['@supabase/supabase-js']) found.add('Supabase Auth');
        if (deps['firebase'] || deps['firebase-admin']) found.add('Firebase Auth');
        if (deps['@clerk/clerk-sdk-node'] || deps['@clerk/nextjs']) found.add('Clerk');

        return Array.from(found);
    }

    private static detectArchitecture(files: string[]): string[] {
        const found = new Set<string>();

        let hasAppDir = false;
        let hasPagesDir = false;
        let hasSrcAppDir = false;
        let hasSrcPagesDir = false;

        const dirs = files.map(f => path.dirname(f));

        dirs.forEach(d => {
            if (d.endsWith('/app')) hasAppDir = true;
            if (d.endsWith('/pages')) hasPagesDir = true;
            if (d.endsWith('/src/app')) hasSrcAppDir = true;
            if (d.endsWith('/src/pages')) hasSrcPagesDir = true;

            if (d.includes('/controllers') && d.includes('/models') && d.includes('/views')) found.add('MVC Pattern');
            if (d.includes('/graphql')) found.add('GraphQL API');
            if (d.includes('/trpc')) found.add('tRPC API');
            if (d.includes('/microservices') || d.includes('/services')) found.add('Service-Oriented');
        });

        if (hasAppDir || hasSrcAppDir) found.add('Next.js App Router');
        if (hasPagesDir || hasSrcPagesDir) found.add('Next.js Pages Router');
        if (files.some(f => f.endsWith('docker-compose.yml'))) found.add('Containerized (Docker)');
        if (files.some(f => f.endsWith('.github/workflows'))) found.add('GitHub Actions CI/CD');

        return Array.from(found).length ? Array.from(found) : ['Standard Node Monolith'];
    }

    private static generateSuggestions(frameworks: string[], databases: string[], auth: string[], arch: string[]): string[] {
        const suggestions: string[] = [];

        if (databases.length > 0 && !databases.includes('Redis')) {
            suggestions.push('Consider adding a caching layer (e.g., Redis) for improved database read performance.');
        }

        if (frameworks.includes('Express') && !auth.includes('JWT') && !auth.includes('Passport.js')) {
            suggestions.push('No standard auth detected for Express. Consider adding Passport.js or JWT validation.');
        }

        if (!arch.includes('Containerized (Docker)')) {
            suggestions.push('Consider adding a Dockerfile and docker-compose.yml for consistent dev/prod environments.');
        }

        if (!arch.includes('GitHub Actions CI/CD')) {
            suggestions.push('Add a CI/CD pipeline (e.g., GitHub Actions) for automated testing and deployment.');
        }

        if (suggestions.length === 0) {
            suggestions.push('Architecture looks solid. Consider tracking bundle size and API latency metrics.');
        }

        return suggestions;
    }
}
