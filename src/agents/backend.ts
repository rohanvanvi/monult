/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Agent — Backend
// ─────────────────────────────────────────────────────────────

import { BaseAgent } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';

export class BackendAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'backend',
            description: 'Expert Backend engineer specializing in Node.js, databases, and microservices.',
            systemPrompt: 'You are a Senior Backend Engineer. You specialize in designing scalable APIs, robust database schemas, and efficient microservices. Focus on data integrity, security, and high availability.',
        });
    }

}
