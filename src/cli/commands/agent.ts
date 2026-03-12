/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { initMonult } from '../utils';

export function registerAgentCommand(program: Command) {
    const agentCmd = program
        .command('agent')
        .description('Manage and run AI agents');

    agentCmd
        .command('list')
        .description('List available AI agents')
        .action(async () => {
            const monult = await initMonult();
            console.log('\n🤖 Available Agents:\n');
            const agents = monult.agentRegistry.list();
            for (const agent of agents) {
                console.log(`  • ${agent.name} — ${agent.description}`);
                if (agent.tools.length > 0) {
                    console.log(`    Tools: ${agent.tools.join(', ')}`);
                }
            }
            console.log();
        });

    agentCmd
        .command('run <agent>')
        .description('Run a specific AI agent')
        .option('-t, --target <path>', 'Target path for the agent')
        .option('-i, --input <text>', 'Input text for the agent')
        .action(async (agentName: string, options) => {
            const monult = await initMonult();
            const agent = monult.agentRegistry.get(agentName);

            if (!agent) {
                console.error(`\n❌ Agent "${agentName}" not found. Available: ${monult.agentRegistry.list().map(a => a.name).join(', ')}\n`);
                process.exit(1);
            }

            const input = options.input || options.target || '';
            console.log(`\n🤖 Running ${agentName} agent...\n`);

            try {
                const result = await agent.run({
                    id: `task-${Date.now()}`,
                    description: `${agentName} analysis`,
                    input,
                });

                console.log(`\n${result.success ? '✅' : '❌'} Agent: ${result.agentName}`);
                console.log(`   Steps: ${result.totalIterations} | Time: ${result.totalLatency}ms`);
                console.log(`\n${result.output}\n`);
            } catch (error) {
                console.error(`\n❌ Agent error: ${error instanceof Error ? error.message : error}\n`);
                process.exit(1);
            }
        });

    agentCmd
        .command('create')
        .description('Scaffold a new AI agent')
        .action(() => {
            // Scaffold out an agent
            console.log('\n🛠️  Agent scaffolding (coming soon). Check docs on how to extend BaseAgent.\n');
        });
}
