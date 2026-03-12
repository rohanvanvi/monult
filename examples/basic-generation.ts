// ─────────────────────────────────────────────────────────────
// Example: Basic AI Generation with Monult
// ─────────────────────────────────────────────────────────────

import { Monult } from '../src/index';

async function main() {
    // Initialize Monult — auto-discovers API keys from environment
    const monult = new Monult({
        providers: {
            openai: { apiKey: process.env.OPENAI_API_KEY },
            claude: { apiKey: process.env.ANTHROPIC_API_KEY },
            gemini: { apiKey: process.env.GOOGLE_API_KEY },
        },
    });

    console.log('🧠 Monult — Basic Generation Example\n');
    console.log('Available providers:', monult.sdk.listProviders().join(', '));
    console.log('Available models:', monult.sdk.listModels().length, '\n');

    // ── Simple generation ──────────────────────────────────
    console.log('─── Single Model Generation ───');
    const result = await monult.generate({
        prompt: 'Explain the concept of recursion with a simple example',
    });

    console.log(`Provider: ${result.provider}`);
    console.log(`Model: ${result.model}`);
    console.log(`Tokens: ${result.usage.totalTokens}`);
    console.log(`Latency: ${result.latency}ms`);
    console.log(`\nResponse:\n${result.content}\n`);

    // ── Smart routing ──────────────────────────────────────
    console.log('─── Smart Routing ───');
    const route = monult.router.route('Fix the null pointer exception in the auth module');
    console.log(`Task type detected: coding`);
    console.log(`Best model: ${route.model.name} (${route.model.provider})`);
    console.log(`Reason: ${route.reason}\n`);

    // ── Intent detection ───────────────────────────────────
    console.log('─── Intent Detection ───');
    const intent = monult.intentEngine.detect('Debug the authentication error in login.ts');
    console.log(`Intent: ${intent.category}`);
    console.log(`Confidence: ${(intent.confidence * 100).toFixed(0)}%`);
    console.log(`Suggested agent: ${intent.suggestedAgent || 'none'}`);
    console.log(`Entities:`, intent.entities.map(e => `${e.type}:${e.value}`).join(', '));

    // ── Cost report ────────────────────────────────────────
    console.log('\n─── Cost Report ───');
    console.log(monult.costTracker.getReport());
}

main().catch(console.error);
