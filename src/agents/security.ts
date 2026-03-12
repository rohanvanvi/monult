/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Security Agent
// ─────────────────────────────────────────────────────────────

import { BaseAgent } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';

export class SecurityAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'security',
            description: 'Performs security audits, vulnerability analysis, and provides security recommendations for code and infrastructure.',
            systemPrompt: `You are an expert security analyst. When analyzing code or systems:
1. Identify security vulnerabilities (OWASP Top 10, CWE)
2. Assess severity and exploitability
3. Provide specific remediation steps with code fixes
4. Review authentication, authorization, input validation
5. Check for secrets exposure, injection risks, XSS, CSRF
Be thorough and prioritize findings by severity.`,
        });
    }

}
