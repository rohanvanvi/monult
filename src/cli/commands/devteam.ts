/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { initMonult } from '../utils';

export function registerDevteamCommand(program: Command) {
    program
        .command('devteam <task>')
        .description('Run a full DevTeam simulation (Architect, Frontend, Backend, Performance, Security)')
        .action(async (task: string) => {
            const monult = await initMonult();
            console.log(`\n🚀 Assembling DevTeam for task: "${task}"\n`);

            try {
                const result = await monult.devteam(task);
                console.log(`\n🏆 DevTeam Complete:\n`);
                console.log(`📁 Workspace: ${result.workspace}`);
                console.log(`📄 Files Created: ${result.files.length}`);
                console.log(`⚡ Commands Executed: ${result.commands.length}`);
                console.log(`🔤 Total Tokens: ${result.totalTokens.toLocaleString()}`);
                console.log(`💰 Estimated Cost: $${result.totalCost.toFixed(4)}`);
                if (result.consensus) {
                    console.log(`\n🎯 Consensus Analysis:\n`);
                    console.log(result.consensus);
                }
            } catch (error) {
                console.error(`\n❌ DevTeam Error: ${error instanceof Error ? error.message : error}\n`);
                process.exit(1);
            }
        });
}
