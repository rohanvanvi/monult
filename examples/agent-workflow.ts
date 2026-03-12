// ─────────────────────────────────────────────────────────────
// Example: AI Agent Workflow with Monult
// ─────────────────────────────────────────────────────────────

import { Monult } from '../src/index';

async function main() {
    const monult = new Monult();

    console.log('🧠 Monult — Agent Workflow Example\n');

    // ── List available agents ──────────────────────────────
    console.log('─── Available Agents ───');
    const agents = monult.agentRegistry.list();
    for (const agent of agents) {
        console.log(`  🤖 ${agent.name} — ${agent.description}`);
    }
    console.log('');

    // ── Run the debugger agent ─────────────────────────────
    console.log('─── Running Debugger Agent ───');
    const debugger_ = monult.agentRegistry.get('debugger');
    if (debugger_) {
        const result = await debugger_.run({
            id: 'task-001',
            description: 'Debug authentication issue',
            input: `
        The following Express middleware is throwing an error:

        function authMiddleware(req, res, next) {
          const token = req.headers.authorization;
          const decoded = jwt.verify(token, process.env.SECRET);
          req.user = decoded;
          next();
        }

        Error: JsonWebTokenError: jwt must be provided
      `,
        });

        console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`Steps: ${result.totalIterations} | Time: ${result.totalLatency}ms`);
        console.log(`\nOutput:\n${result.output}\n`);
    }

    // ── Run the architect agent ────────────────────────────
    console.log('─── Running Architect Agent ───');
    const architect = monult.agentRegistry.get('architect');
    if (architect) {
        const result = await architect.run({
            id: 'task-002',
            description: 'Design chat system architecture',
            input: 'Design a real-time chat system that supports 1M concurrent users, message persistence, and end-to-end encryption.',
        });

        console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`\nOutput:\n${result.output.slice(0, 500)}...`);
    }

    // ── Security scan ──────────────────────────────────────
    console.log('\n─── Security Scan ───');
    const scanResult = monult.securityEngine.scanCode(`
    const apiKey = "sk-1234567890abcdef";
    const query = \`SELECT * FROM users WHERE id = '\${req.params.id}'\`;
    eval(userInput);
  `);

    console.log(`Safe: ${scanResult.safe ? '✅' : '❌'}`);
    console.log(`Score: ${scanResult.score}/100`);
    for (const threat of scanResult.threats) {
        console.log(`  ⚠️  [${threat.severity.toUpperCase()}] ${threat.type}: ${threat.description}`);
    }
}

main().catch(console.error);
