/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { initMonult } from '../utils';

export function registerCoreCommands(program: Command) {
    program
        .command('ask <question>')
        .description('Ask a question to AI')
        .option('-m, --model <model>', 'AI model to use')
        .option('-p, --provider <provider>', 'AI provider')
        .option('--debate', 'Enable multi-model debate')
        .option('--optimizeCost', 'Route to the optimal model based on cost and prompt complexity')
        .option('--json', 'Output as JSON')
        .action(async (question: string, options) => {
            const monult = await initMonult();

            console.log(`\n🤔 Thinking...\n`);

            try {
                if (options.debate) {
                    const result = await monult.assembly({
                        models: monult.sdk.listProviders().slice(0, 3),
                        debate: true,
                        verify: true,
                        prompt: question,
                    });

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log('--- REASONING STAGES ---');
                        result.stages.forEach(s => {
                            console.log(`\n[${s.model}] (${s.response.latency}ms):`);
                            console.log(`   Tokens (prompt: ${s.response.usage?.promptTokens}, output: ${s.response.usage?.completionTokens})`);
                            console.log(s.response.content.substring(0, 100) + '...');
                        });
                        console.log('\n--- CONSENSUS RESULT ---\n');
                        console.log(result.consensus);
                        console.log(`\n📊 ${result.totalTokens} tokens | ${result.totalLatency}ms\n`);
                    }
                } else if (options.optimizeCost) {
                    const result = await monult.ask(question, { optimizeCost: true });

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(`[Routed to: ${result.provider} / ${result.model}]`);
                        console.log(result.content);
                        console.log(`\n📊 ${result.usage.totalTokens} tokens | ${result.latency}ms\n`);
                    }
                } else {
                    // Use same smart model selection as DevTeam
                    const availableModels = monult.sdk.listModels();
                    const preferredModels = ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024']
                        .filter(model => availableModels.some(m => m.id === model || m.provider === model));
                    
                    const selectedModel = preferredModels.length > 0 ? preferredModels[0] : availableModels[0]?.id;
                    
                    const result = await monult.generate({
                        provider: undefined, // Let SDK use smart routing
                        model: selectedModel,
                        prompt: question,
                    });

                    if (options.json) {
                        console.log(JSON.stringify(result, null, 2));
                    } else {
                        console.log(result.content);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : error}`);
                process.exit(1);
            }
        });

    program
        .command('chat')
        .description('Start interactive AI chat')
        .option('-m, --model <model>', 'AI model to use', 'auto')
        .option('-p, --provider <provider>', 'AI provider', '')
        .option('--debate', 'Enable multi-model debate mode')
        .action(async (options) => {
            console.log('🤖 Starting interactive chat (Ctrl+C to exit)\n');

            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            const monult = await initMonult();
            let historyContext = '';

            const askQuestion = () => {
                rl.question('You: ', async (input) => {
                    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
                        rl.close();
                        return;
                    }

                    console.log('🤖: Thinking...');
                    try {
                        let responseText = '';
                        historyContext += `\nUser: ${input}`;

                        if (options.debate) {
                            const result = await monult.assembly({
                                models: monult.sdk.listProviders().slice(0, 3),
                                debate: true,
                                prompt: historyContext,
                            });
                            responseText = result.consensus;
                        } else {
                            const result = await monult.generate({
                                provider: options.provider || undefined,
                                model: options.model === 'auto' ? undefined : options.model,
                                prompt: historyContext,
                            });
                            responseText = result.content;
                        }

                        historyContext += `\nAI: ${responseText}`;
                        process.stdout.write(`\r🤖: ${responseText}\n\n`);
                    } catch (error) {
                        console.log(`\r🤖: Error: ${error instanceof Error ? error.message : error}\n`);
                    }

                    askQuestion();
                });
            };

            askQuestion();
        });

    program
        .command('analyze <path>')
        .description('Analyze a project or file')
        .action(async (targetPath: string) => {
            console.log(`\n🔍 Analyzing project at: ${targetPath}...\n`);

            try {
                const { RepoAnalyzerTool } = await import('../../tools/repo-analyzer');
                const result = RepoAnalyzerTool.analyze(targetPath);

                console.log(`Framework: ${result.frameworks.join(', ') || 'None'}`);
                console.log(`Database: ${result.databases.join(', ') || 'None'}`);
                console.log(`Auth: ${result.auth.join(', ') || 'None'}`);
                console.log(`Architecture: ${result.architecture.join(', ') || 'Unknown'}\n`);

                if (result.suggestions.length > 0) {
                    console.log('Suggestions:');
                    result.suggestions.forEach(s => console.log(`- ${s}`));
                    console.log();
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : error}`);
                process.exit(1);
            }
        });

    program
        .command('benchmark <prompt>')
        .description('Benchmark all configured models')
        .action(async (prompt: string) => {
            const monult = await initMonult();

            try {
                console.log(`\n🚀 Benchmarking prompt: "${prompt}"\n`);
                const results = await monult.benchmark(prompt);

                console.log('\n📊 Benchmark Results:\n');
                const sorted = results.sort((a, b) => a.latencyMs - b.latencyMs);

                sorted.forEach((res, index) => {
                    const isFastest = index === 0;
                    console.log(`${isFastest ? '🥇 ' : '   '}${res.model.padEnd(20)} | ${res.latencyMs.toString().padStart(5)}ms | ${res.tokens.totalTokens.toString().padStart(4)} tokens`);
                });
                console.log();

            } catch (error) {
                console.error(`Benchmark Error: ${error instanceof Error ? error.message : error}`);
                process.exit(1);
            }
        });
}
