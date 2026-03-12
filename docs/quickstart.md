# Quick Start Guide

## Installation

```bash
# Install the Monult CLI globally
npm install -g monult
```

## Setup & Configuration

Initialize a Monult environment in your project. This creates a `.monult.json` tracking file.

```bash
monult init
```

Register your AI provider keys. These are stored securely in `~/.monult/config.json`.

```bash
monult provider add openai
monult provider add claude
monult provider add gemini
monult provider add cohere
```

To isolate memory and configurations per-project, assign a workspace:

```bash
monult workspace create "my-saas-app"
```

## CLI Usage

Monult's CLI brings full orchestration to your terminal.

```bash
# 1. Ask a question (uses the default router/provider)
monult ask "Explain Node.js event loops"

# 2. Run an AI debate
monult ask "SQL vs NoSQL for a messaging app" --debate

# 3. Analyze a local repository
monult analyze ./my-project

# 4. Trigger the DevTeam (Multi-Agent framework)
monult devteam "Build a scalable auth system"

# 5. Execute a specific standalone agent
monult agent run debugger -i "fix the memory leak in auth-middleware.ts"

# 6. Hybrid Assemblies (Models + Agents)
monult hybrid-assembly "Design a React app" -m claude,openai -a architect,frontend

# 7. Run declarative JSON workflows
monult workflow run ci-pipeline.json

# 8. Start the REST API & Dashboard
monult start
```

## Universal SDK Usage

Incorporate Monult's powerful orchestration directly into your own Node/TypeScript backends.

```typescript
import { UniversalSDK, AssemblyEngine, HybridAssemblyEngine } from 'monult';

const monult = new UniversalSDK({
  providers: {
    openai: { apiKey: process.env.OPENAI_API_KEY },
    claude: { apiKey: process.env.ANTHROPIC_API_KEY },
  }
});

// A standard query
const result = await monult.generate({
  model: 'claude', // Or let the SmartRouter decide
  prompt: 'Explain recursion',
});
console.log(result.content);

// Multi-Model Assembly with Debate & Verification
const assembly = new AssemblyEngine(monult);
const output = await assembly.run({
  models: ['claude', 'openai'],
  debate: true,
  verify: true,
  prompt: 'Design a scalable backend system',
});

console.log('Final Verified Answer:', output.consensus);
console.log('Engine Confidence:', output.confidence);

// Hybrid Assembly (Combine models directly with domain Agents)
const hybrid = new HybridAssemblyEngine(monult);
const hr = await hybrid.run({
  models: ['claude', 'openai'],
  agents: ['architect', 'security'],
  prompt: 'Design a secure payment portal'
});
console.log(hr.consensus);
```

## Running the Web Dashboard and API

Monult comes with a Next.js control panel and an Express.js REST API.

Start everything with:

```bash
monult start --port 3000
```

- **Dashboard**: `http://localhost:3001` (Visualize tokens, debate graphs, cost analysis)
- **API Endpoints**: `http://localhost:3000/api/*`
- **Swagger Docs**: `http://localhost:3000/api/docs`

Test the API:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'
```

## Next Steps

Explore the individual deep-dive guides:

- [Architecture Overview](architecture.md)
- [Agent Framework Details](agents.md)
- [Assembly Engines Explained](assemblies.md)
- [Model Router & Cost Optimizations](model-router.md)
- [Dashboard Guide](dashboard.md)
