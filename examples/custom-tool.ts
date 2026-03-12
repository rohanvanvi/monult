// ─────────────────────────────────────────────────────────────
// Example: Custom Tool Plugin for Monult
// ─────────────────────────────────────────────────────────────

import { BaseTool, ToolResult } from '../src/tools/base';
import { Monult } from '../src/index';

/**
 * Example: Custom tool that checks npm package info.
 */
class NpmPackageTool extends BaseTool {
    constructor() {
        super('npm-package', 'Look up npm package information', [
            { name: 'package', type: 'string', description: 'Package name to look up', required: true },
        ]);
    }

    async execute(input: string): Promise<ToolResult> {
        const startTime = Date.now();
        const packageName = input.trim();

        try {
            const response = await fetch(`https://registry.npmjs.org/${packageName}`);
            const data = await response.json() as Record<string, any>;
            const latency = Date.now() - startTime;

            if (data.error) {
                return this.failure(`Package not found: ${packageName}`, latency);
            }

            const latest = data['dist-tags']?.latest || 'unknown';
            const description = data.description || 'No description';
            const license = data.license || 'Unknown';

            const output = [
                `📦 ${packageName}@${latest}`,
                `   ${description}`,
                `   License: ${license}`,
                `   Homepage: ${data.homepage || 'N/A'}`,
            ].join('\n');

            return this.success(output, { name: packageName, version: latest, description }, latency);
        } catch (error) {
            return this.failure(`Error looking up package: ${error instanceof Error ? error.message : 'Unknown'}`, Date.now() - startTime);
        }
    }
}

async function main() {
    console.log('🧠 Monult — Custom Tool Plugin Example\n');

    // Create the custom tool
    const npmTool = new NpmPackageTool();

    // Use it directly
    const result = await npmTool.execute('express');
    console.log(result.output);
    console.log(`\nLookup time: ${result.latency}ms\n`);

    // Register with an agent
    const monult = new Monult();
    const debugger_ = monult.agentRegistry.get('debugger');
    if (debugger_) {
        debugger_.registerTool(npmTool);
        console.log('✅ Custom tool registered with debugger agent');
        console.log('   Tools:', debugger_.info().tools.join(', '));
    }

    console.log('\n── Creating Custom Tools ──');
    console.log('1. Extend BaseTool class');
    console.log('2. Implement execute() method');
    console.log('3. Register with agent.registerTool()');
    console.log('4. Agent will auto-discover and use the tool');
}

main().catch(console.error);
