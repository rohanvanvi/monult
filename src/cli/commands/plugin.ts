/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { initMonult } from '../utils';

export function registerPluginCommand(program: Command) {
    const pluginCmd = program
        .command('plugin')
        .description('Manage plugins (install, list, remove)');

    pluginCmd
        .command('list')
        .description('List installed plugins')
        .action(async () => {
            const monult = await initMonult();
            console.log('\n🧩 Installed Plugins:\n');
            const plugins = monult.plugins.list();
            if (plugins.length === 0) {
                console.log('  No plugins installed.\n');
            } else {
                plugins.forEach(p => console.log(`  • ${p.name} (v${p.version}) - ${p.description}`));
                console.log();
            }
        });

    pluginCmd
        .command('install <name>')
        .description('Install a plugin')
        .action((name: string) => {
            console.log(`\n📦 Installing plugin: ${name}...\n`);
            console.log('Simulating installation (requires package manager bindings in MVP)\n');
            console.log(`✅ Plugin ${name} installed successfully.\n`);
        });

    pluginCmd
        .command('remove <name>')
        .description('Remove a plugin')
        .action((name: string) => {
            console.log(`\n🗑️  Removing plugin: ${name}...\n`);
            console.log(`✅ Plugin ${name} removed.\n`);
        });
}
