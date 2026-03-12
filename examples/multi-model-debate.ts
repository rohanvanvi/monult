// ─────────────────────────────────────────────────────────────
// Example: Multi-Model AI Debate with Monult
// ─────────────────────────────────────────────────────────────

import { Monult } from '../src/index';

async function main() {
    const monult = new Monult();

    console.log('🧠 Monult — Multi-Model Debate Example\n');

    // ── Run a multi-model assembly with debate ─────────────
    const result = await monult.assembly({
        models: ['claude', 'openai', 'gemini'],
        debate: true,
        verify: true,
        rounds: 2,
        prompt: 'Design a scalable event-driven backend architecture for a real-time collaboration app like Figma.',
    });

    console.log('─── Assembly Result ───');
    console.log(`Assembly ID: ${result.id}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`Total Latency: ${result.totalLatency}ms`);
    console.log(`Total Tokens: ${result.totalTokens}`);
    console.log(`Estimated Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`Stages: ${result.stages.length}`);

    console.log('\n─── Stage Breakdown ───');
    for (const stage of result.stages) {
        console.log(`  ${stage.name} (${stage.model} — ${stage.role})`);
        console.log(`    Tokens: ${stage.response.usage.totalTokens} | ${stage.response.latency}ms`);
        console.log(`    Preview: ${stage.response.content.slice(0, 100)}...`);
        console.log('');
    }

    console.log('─── Final Consensus ───');
    console.log(result.consensus);

    if (result.debate) {
        console.log(`\n─── Debate Info ───`);
        console.log(`Debate ID: ${result.debate.id}`);
        console.log(`Rounds: ${result.debate.totalRounds}`);
        console.log(`Participants: ${result.debate.participatingModels.join(', ')}`);
    }

    console.log('\n─── Reasoning ───');
    console.log(result.reasoning);
}

main().catch(console.error);
