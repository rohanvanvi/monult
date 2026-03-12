#!/usr/bin/env node
/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — CLI Interface
// ─────────────────────────────────────────────────────────────

import { Command } from 'commander';

import { registerInitCommand } from './commands/init';
import { registerProviderCommand } from './commands/provider';
import { registerCoreCommands } from './commands/core';
import { registerAgentCommand } from './commands/agent';
import { registerDevteamCommand } from './commands/devteam';
import { registerWorkflowCommand } from './commands/workflow';
import { registerPluginCommand } from './commands/plugin';
import { registerDoctorCommand } from './commands/doctor';
import { registerGraphCommand } from './commands/graph';
import { registerDevCommands } from './commands/dev';
import { createWorkspaceCommand } from './commands/workspace';

const program = new Command();

// Read version dynamically if running inside the original project context
let version = '1.0.0';
try {
    const fs = require('fs');
    const path = require('path');
    // Try multiple possible locations (works from dist/cli/ and src/cli/)
    const candidates = [
        path.join(__dirname, '../../package.json'),     // dist/cli/ → root
        path.join(__dirname, '../../../package.json'),   // fallback
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
            version = pkg.version;
            break;
        }
    }
} catch (e) {
    // Fallback if built and moved
}

program
    .name('monult')
    .description('Monult OS — Multi-Model AI Developer Platform')
    .version(version, '-v, --version', 'Output the current Monult version');

// ── Register Commands ────────────────────────────────────────

registerInitCommand(program);
registerProviderCommand(program);
registerCoreCommands(program);
registerAgentCommand(program);
registerDevteamCommand(program);
registerWorkflowCommand(program);
registerPluginCommand(program);
registerDoctorCommand(program);
registerGraphCommand(program);
registerDevCommands(program);
createWorkspaceCommand(program);

// ── Start CLI ────────────────────────────────────────────────

program.parse(process.argv);
