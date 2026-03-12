/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { configManager } from '../../config/config-manager';
import inquirer from 'inquirer';

export function registerProviderCommand(program: Command) {
    const providerCmd = program
        .command('provider')
        .description('Manage AI providers');

    providerCmd
        .command('add <name>')
        .description('Add a new provider or update its API key')
        .action(async (name: string) => {
            const answers = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: `Enter API key for ${name}:`,
                    mask: '*'
                }
            ]);

            if (answers.apiKey) {
                await configManager.setProviderConfig(name, { apiKey: answers.apiKey });
                console.log(`\n✅ Provider '${name}' configured successfully.\n`);
            } else {
                console.log(`\n❌ API key is required.\n`);
            }
        });

    providerCmd
        .command('list')
        .description('List configured providers')
        .action(async () => {
            const config = await configManager.getGlobalConfig();
            console.log('\n🔌 Configured Providers:\n');
            const providers = Object.keys(config.providers || {});

            if (providers.length === 0) {
                console.log('  No providers configured. Use `monult provider add <name>`\n');
            } else {
                for (const p of providers) {
                    const isDefault = config.defaultProvider === p ? ' (default)' : '';
                    console.log(`  • ${p}${isDefault} [Configured]`);
                }
                console.log();
            }
        });

    providerCmd
        .command('remove <name>')
        .description('Remove a configured provider')
        .action(async (name: string) => {
            const removed = await configManager.removeProviderConfig(name);
            if (removed) {
                console.log(`\n✅ Provider '${name}' removed successfully.\n`);
            } else {
                console.log(`\n⚠️  Provider '${name}' not found.\n`);
            }
        });

    providerCmd
        .command('use <name>')
        .description('Set the default provider')
        .action(async (name: string) => {
            const config = await configManager.getGlobalConfig();
            if (config.providers && config.providers[name]) {
                config.defaultProvider = name;
                await configManager.saveGlobalConfig(config);
                console.log(`\n✅ Default provider set to '${name}'.\n`);
            } else {
                console.error(`\n❌ Provider '${name}' is not configured. Add it first.\n`);
            }
        });
}
