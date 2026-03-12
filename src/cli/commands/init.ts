/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { configManager, LocalConfig } from '../../config/config-manager';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';

export function registerInitCommand(program: Command) {
    program
        .command('init')
        .description('Initialize Monult inside a project')
        .action(async () => {
            console.log('\n🚀 Initializing Monult OS in current project...\n');

            const existingConfig = await configManager.getLocalConfig();
            if (existingConfig) {
                console.log('⚠️  Project is already initialized. (.monult.json exists)\n');
                return;
            }

            // Simple heuristics for detection
            let detectedFramework = 'node';
            let detectedLanguage = 'javascript';

            try {
                const pkgJsonRaw = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8');
                const pkgJson = JSON.parse(pkgJsonRaw);

                if (pkgJson.dependencies?.next || pkgJson.devDependencies?.next) {
                    detectedFramework = 'nextjs';
                } else if (pkgJson.dependencies?.react || pkgJson.devDependencies?.react) {
                    detectedFramework = 'react';
                } else if (pkgJson.dependencies?.vue || pkgJson.devDependencies?.vue) {
                    detectedFramework = 'vue';
                }

                if (pkgJson.devDependencies?.typescript || pkgJson.dependencies?.typescript) {
                    detectedLanguage = 'typescript';
                }
            } catch (e) {
                // Ignore if package.json doesn't exist
            }

            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'projectName',
                    message: 'Project name:',
                    default: path.basename(process.cwd())
                },
                {
                    type: 'list',
                    name: 'language',
                    message: 'Primary language:',
                    choices: ['typescript', 'javascript', 'python', 'other'],
                    default: detectedLanguage
                },
                {
                    type: 'list',
                    name: 'framework',
                    message: 'Framework:',
                    choices: ['node', 'nextjs', 'react', 'vue', 'express', 'other'],
                    default: detectedFramework
                },
                {
                    type: 'checkbox',
                    name: 'agents',
                    message: 'Default active agents:',
                    choices: ['architect', 'frontend', 'backend', 'security', 'performance', 'devops', 'debugger', 'docs'],
                    default: ['architect', 'debugger', 'security']
                }
            ]);

            const newConfig: LocalConfig = {
                projectName: answers.projectName,
                language: answers.language,
                framework: answers.framework,
                agents: answers.agents
            };

            await configManager.saveLocalConfig(newConfig);
            console.log(`\n✅ Monult initialized successfully! Created .monult.json\n`);
        });
}
