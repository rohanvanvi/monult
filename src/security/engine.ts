/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Security Engine
// ─────────────────────────────────────────────────────────────
// Protects against prompt injection, API key leaks,
// malicious code suggestions, and unsafe dependencies.
// ─────────────────────────────────────────────────────────────

export interface SecurityScanResult {
    safe: boolean;
    threats: SecurityThreat[];
    score: number; // 0 (dangerous) to 100 (safe)
    timestamp: number;
}

export interface SecurityThreat {
    type: 'prompt_injection' | 'api_key_leak' | 'malicious_code' | 'unsafe_dependency' | 'data_exfiltration';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    location?: string;
    recommendation: string;
}

/**
 * Security Engine — protects developers from AI-related risks.
 */
export class SecurityEngine {
    private apiKeyPatterns: RegExp[] = [
        /sk-[a-zA-Z0-9]{20,}/g,                    // OpenAI
        /sk-ant-[a-zA-Z0-9-]{20,}/g,               // Anthropic
        /AIza[a-zA-Z0-9_-]{35}/g,                   // Google
        /ghp_[a-zA-Z0-9]{36}/g,                     // GitHub
        /AKIA[A-Z0-9]{16}/g,                        // AWS
        /xox[bprs]-[a-zA-Z0-9-]{10,}/g,            // Slack
        /(?:password|secret|token|key)\s*[:=]\s*["']?[a-zA-Z0-9_-]{8,}/gi,
    ];

    private injectionPatterns: RegExp[] = [
        /ignore\s+(all\s+)?previous\s+instructions/i,
        /disregard\s+(all\s+)?prior/i,
        /you\s+are\s+now\s+(?:a\s+)?(?:DAN|jailbreak)/i,
        /system\s*:\s*you\s+are/i,
        /\[SYSTEM\]/i,
        /pretend\s+you\s+(?:are|have)\s+no\s+(?:rules|restrictions)/i,
        /do\s+anything\s+now/i,
        /bypass\s+(?:your\s+)?(?:safety|content|ethical)\s+(?:filters|guidelines)/i,
    ];

    private maliciousPatterns: RegExp[] = [
        /eval\s*\(/g,
        /exec\s*\(/g,
        /child_process/g,
        /rm\s+-rf/g,
        /format\s+[cC]:/g,
        /\bsudo\b.*(?:rm|chmod\s+777|dd\s+if)/g,
        /curl.*\|\s*(?:bash|sh)/g,
        /wget.*\|\s*(?:bash|sh)/g,
    ];

    /**
     * Scan a prompt for security threats.
     */
    scanPrompt(prompt: string): SecurityScanResult {
        const threats: SecurityThreat[] = [];

        // Check for prompt injection
        for (const pattern of this.injectionPatterns) {
            if (pattern.test(prompt)) {
                threats.push({
                    type: 'prompt_injection',
                    severity: 'high',
                    description: `Potential prompt injection detected: ${pattern.source}`,
                    recommendation: 'Sanitize user input before passing to AI models.',
                });
            }
        }

        // Check for API key leaks
        for (const pattern of this.apiKeyPatterns) {
            const matches = prompt.match(pattern);
            if (matches) {
                threats.push({
                    type: 'api_key_leak',
                    severity: 'critical',
                    description: `API key or secret detected in prompt (${matches.length} match(es))`,
                    recommendation: 'Remove secrets from prompts. Use environment variables instead.',
                });
            }
        }

        const score = this.calculateSafetyScore(threats);

        return {
            safe: threats.length === 0,
            threats,
            score,
            timestamp: Date.now(),
        };
    }

    /**
     * Scan AI-generated code for security issues.
     */
    scanCode(code: string): SecurityScanResult {
        const threats: SecurityThreat[] = [];

        // Check for malicious patterns
        for (const pattern of this.maliciousPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                threats.push({
                    type: 'malicious_code',
                    severity: 'high',
                    description: `Potentially dangerous code pattern: ${matches[0]}`,
                    recommendation: 'Review this code carefully before execution.',
                });
            }
        }

        // Check for key leaks in code
        for (const pattern of this.apiKeyPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                threats.push({
                    type: 'api_key_leak',
                    severity: 'critical',
                    description: 'API key or secret found in generated code',
                    recommendation: 'Replace hardcoded secrets with environment variables.',
                });
            }
        }

        // Check for unsafe dependencies
        const unsafeDeps = ['event-stream', 'flatmap-stream', 'colors@1.4.1', 'faker@6.6.6'];
        for (const dep of unsafeDeps) {
            if (code.includes(dep)) {
                threats.push({
                    type: 'unsafe_dependency',
                    severity: 'critical',
                    description: `Known malicious package referenced: ${dep}`,
                    recommendation: `Do not install ${dep}. Use a vetted alternative.`,
                });
            }
        }

        const score = this.calculateSafetyScore(threats);

        return {
            safe: threats.length === 0,
            threats,
            score,
            timestamp: Date.now(),
        };
    }

    /**
     * Sanitize a prompt by removing detected threats.
     */
    sanitize(prompt: string): string {
        let sanitized = prompt;

        // Remove potential injections
        for (const pattern of this.injectionPatterns) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }

        // Mask API keys
        for (const pattern of this.apiKeyPatterns) {
            sanitized = sanitized.replace(pattern, '[REDACTED_KEY]');
        }

        return sanitized;
    }

    private calculateSafetyScore(threats: SecurityThreat[]): number {
        if (threats.length === 0) return 100;

        let score = 100;
        for (const threat of threats) {
            switch (threat.severity) {
                case 'critical': score -= 40; break;
                case 'high': score -= 25; break;
                case 'medium': score -= 15; break;
                case 'low': score -= 5; break;
            }
        }
        return Math.max(0, score);
    }
}
