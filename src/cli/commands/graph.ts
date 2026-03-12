/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import { initMonult } from '../utils';

export function registerGraphCommand(program: Command) {
    program
        .command('graph')
        .description('Export the current Assembly Graph as JSON')
        .action(async () => {
            const monult = await initMonult();
            console.log(monult.graph.exportJSON());
        });
}
