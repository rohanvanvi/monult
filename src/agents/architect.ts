/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Architect Agent
// ─────────────────────────────────────────────────────────────

import { BaseAgent } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';

export class ArchitectAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'architect',
            description: 'Designs software architectures, patterns, and system designs. Reviews code structure and suggests improvements.',
            systemPrompt: `You are an expert software architect. When given a design challenge:
1. Analyze requirements and constraints
2. Propose architecture with clear component separation
3. Define interfaces and data flow
4. Consider scalability, maintainability, and performance
5. Provide implementation guidance with code examples
Use industry best practices and design patterns.`,
        });
    }

}
