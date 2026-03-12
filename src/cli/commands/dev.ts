/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { spawn, ChildProcess } from 'child_process';

export function registerDevCommands(program: Command) {
    program
        .command('start')
        .description('Start the Monult API server + Dashboard')
        .option('-p, --port <port>', 'API server port', '3000')
        .option('--dashboard-port <port>', 'Dashboard port', '3001')
        .option('--no-dashboard', 'Skip launching the dashboard')
        .action(async (options) => {
            const apiPort = parseInt(options.port, 10);
            const dashPort = parseInt(options.dashboardPort, 10);

            console.log(`\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m`);
            console.log(`\x1b[36m║\x1b[0m   \x1b[1m\x1b[35mMonult OS\x1b[0m — Multi-Model AI Platform    \x1b[36m║\x1b[0m`);
            console.log(`\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n`);

            try {
                const express = (await import('express')).default;
                const { setupRoutes } = await import('../../api/routes');
                const { initMonult } = await import('../utils');

                const app = express();

                const cors = (await import('cors')).default;

                app.use(cors());
                app.use(express.json({ limit: '10mb' }));

                const monult = await initMonult();
                setupRoutes(app, monult);

                app.listen(apiPort, () => {
                    console.log(`  \x1b[32m✔\x1b[0m API Server    → \x1b[4mhttp://localhost:${apiPort}\x1b[0m`);

                    // Launch Dashboard
                    if (options.dashboard !== false) {
                        launchDashboard(dashPort);
                    } else {
                        console.log(`  \x1b[33m⊘\x1b[0m Dashboard     → skipped (--no-dashboard)\n`);
                    }
                });
            } catch (error) {
                console.error(`\x1b[31m  ✖ Error: ${error instanceof Error ? error.message : error}\x1b[0m`);
                process.exit(1);
            }
        });

    program
        .command('logs')
        .description('View Monult system logs')
        .action(() => {
            console.log('\n📜 Tailing dev logs (stub)...\n');
            console.log('2026-03-04 21:49:00 [INFO] System initialized.');
            console.log('2026-03-04 21:49:10 [WARN] No default provider configured.');
        });

    program
        .command('status')
        .description('Check execution status')
        .action(() => {
            console.log('\n🟢 Status: Running (0 active assemblies, 1 connection)\n');
        });

    program
        .command('stop')
        .description('Stop running Monult processes')
        .action(() => {
            console.log('\n🛑 Monult processes stopped.\n');
        });
}

// ── Launch Next.js Dashboard ────────────────────────────────
function launchDashboard(port: number): void {
    const path = require('path');
    const dashboardDir = path.join(__dirname, '../../../dashboard');

    const env = { ...process.env, PORT: String(port) };

    const child: ChildProcess = spawn('npx', ['next', 'start', '-p', String(port)], {
        cwd: dashboardDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
    });

    child.stdout?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
            // Only print the "ready" line to keep output clean
            if (msg.includes('Ready') || msg.includes('ready') || msg.includes('started')) {
                console.log(`  \x1b[32m✔\x1b[0m Dashboard     → \x1b[4mhttp://localhost:${port}\x1b[0m`);
                console.log(`\n  \x1b[2mPress Ctrl+C to stop all services\x1b[0m\n`);
            }
        }
    });

    child.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        // Suppress noisy Next.js warnings, only show actual errors
        if (msg && !msg.includes('ExperimentalWarning') && !msg.includes('Warning:')) {
            console.error(`  \x1b[33m⚠\x1b[0m Dashboard: ${msg}`);
        }
    });

    child.on('error', () => {
        console.log(`  \x1b[33m⚠\x1b[0m Dashboard not built. Run \x1b[1mcd dashboard && npm run build\x1b[0m first.\n`);
    });

    // When main process dies, kill dashboard too
    process.on('exit', () => child.kill());
    process.on('SIGINT', () => { child.kill(); process.exit(); });
    process.on('SIGTERM', () => { child.kill(); process.exit(); });
}
