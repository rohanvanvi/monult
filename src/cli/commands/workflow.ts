/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { initMonult } from '../utils';
import fs from 'fs/promises';
import path from 'path';

export function registerWorkflowCommand(program: Command) {
    const workflowCmd = program
        .command('workflow')
        .description('Manage and run JSON workflows');

    workflowCmd
        .command('run <file>')
        .description('Execute a workflow configuration file')
        .action(async (file: string) => {
            const monult = await initMonult();

            try {
                const content = await fs.readFile(path.resolve(file), 'utf-8');
                const config = JSON.parse(content);

                console.log(`\n⚙️  Running workflow: ${config.name || file}\n`);

                const result = await monult.workflows.run(config);

                if (result.success) {
                    console.log(`\n✅ Workflow Completed in ${result.totalLatency}ms\n`);
                    console.log(JSON.stringify(result.outputs, null, 2));
                } else {
                    console.error(`\n❌ Workflow Failed: ${result.error?.message}`);
                    console.log('Outputs before failure:', result.outputs);
                    process.exit(1);
                }
            } catch (error) {
                console.error(`Error loading or running workflow: ${error instanceof Error ? error.message : error}`);
                process.exit(1);
            }
        });

    workflowCmd
        .command('create')
        .description('Scaffold a new workflow JSON file')
        .action(async () => {
            const defaultWorkflow = {
                name: "Example Workflow",
                nodes: [
                    {
                        id: "step1",
                        action: "model",
                        prompt: "Write a poem about CI/CD"
                    }
                ]
            };
            await fs.writeFile('workflow.json', JSON.stringify(defaultWorkflow, null, 2));
            console.log('\n📝 Created workflow.json\n');
        });

    workflowCmd
        .command('list')
        .description('List workflows in the current directory')
        .action(async () => {
            console.log('\n(Use `ls *.json` for now, automatic JSON discovery coming soon)\n');
        });
}
