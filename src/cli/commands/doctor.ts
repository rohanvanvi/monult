/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { configManager } from '../../config/config-manager';
import fs from 'fs/promises';
import path from 'path';

export function registerDoctorCommand(program: Command) {
    program
        .command('doctor')
        .description('Check Monult system health')
        .action(async () => {
            console.log('\n🩺 Monult System Diagnostics\n');
            let hasErrors = false;

            // 1. Node.js check
            const nodeVersion = process.version;
            const isNodeCompatible = Number(nodeVersion.slice(1).split('.')[0]) >= 18;
            console.log(`${isNodeCompatible ? '✔' : '❌'} Node.js installed (${nodeVersion})`);
            if (!isNodeCompatible) hasErrors = true;

            // 2. Local config check
            const localConfig = await configManager.getLocalConfig();
            if (localConfig) {
                console.log(`✔ Monult initialized in project (.monult.json found, framework: ${localConfig.framework || 'unknown'})`);
            } else {
                console.log(`❌ Monult not initialized in project (run \`monult init\`)`);
                hasErrors = true;
            }

            // 3. Global config & Providers check
            const globalConfig = await configManager.getGlobalConfig();
            const providers = Object.keys(globalConfig.providers || {}).filter(k => globalConfig.providers[k].apiKey || globalConfig.providers[k].baseUrl);

            if (providers.length > 0) {
                console.log(`✔ Providers configured (${providers.join(', ')})`);
            } else {
                console.log(`❌ No providers configured (run \`monult provider add <name>\`)`);
                hasErrors = true;
            }

            // 4. API / Build check
            try {
                // Since this is local dev source, check if the CLI binary exists in dist
                const binExists = await fs.stat(path.resolve(__dirname, '../../../../bin', 'monult.js')).catch(() => false);
                const isProd = __dirname.includes('dist');
                if (isProd || binExists) {
                    console.log(`✔ CLI build reachable`);
                } else {
                    console.log(`⚠️  CLI build not detected. Did you run \`npm run build\`?`);
                }
            } catch {
                console.log(`❌ Failed to verify build environment`);
            }

            console.log('');
            if (hasErrors) {
                console.error('⚠️  Doctor found issues that may prevent Monult from running correctly.\n');
                process.exit(1);
            } else {
                console.log('✅ System is healthy and ready to run Monult OS.\n');
            }
        });
}
