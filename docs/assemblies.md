# Assembly Engines

## Overview

Monult replaces traditional single-model prompting with **Collaborative Assemblies**. An assembly dictates a structured pipeline where multiple AI endpoints (or Agents) work together to refine a single response.

Monult ships with two primary structural models: `AssemblyEngine` and `AgentAssemblyEngine`.

## 1. Model Assembly (`AssemblyEngine`)

This engine pushes purely text-based LLMs through an iterative pipeline. 

### The Pipeline Steps

1. **Propose**: A primary model (e.g., Claude 3.5 Sonnet) drafts the initial answer.
2. **Critique**: A secondary analytic model (e.g., GPT-4o) reviews the proposal strictly looking for logical fallacies or missing points.
3. **Improve**: The original model refines its answer based on the critique.
4. **Debate**: If `debate: true` is enabled, two models actively argue contrarian points across multiple rounds (`rounds: 3`).
5. **Verify**: A fast/cheap model (like Llama 3) sanity-checks the refined response.
6. **Consensus**: A final aggregation layer merges insights and determines the highest-scoring outcome.

### Usage

```typescript
import { AssemblyEngine } from 'monult';

const assembly = new AssemblyEngine(monult);
const output = await assembly.run({
  models: ['claude', 'openai', 'gemini'],
  debate: true,       // Models act adversarially 
  verify: true,       // Last pass sanity checks
  prompt: 'Generate an array sorting algorithm faster than Quicksort',
  rounds: 2           // Two round-trips of debating
});

console.log(output.consensus); // The definitive answer
```

### When to use Model Assembly:
- You need the highest possible logical accuracy (e.g., complex math, system design).
- You want to eliminate single-model biases.
- Tasks that are purely cognitive and require no file-system execution.

---

## 2. Agent Assembly (`AgentAssemblyEngine`)

Agent Assembly shifts the paradigm from pure text to **executable intelligence**. It networks specialized `BaseAgent` instances like `architect`, `security`, and `debugger` together.

### The Pipeline Steps

1. **Tool Invocation**: Agents act upon the environment. The `debugger` reads local files, while the `architect` queries Github integrations.
2. **Knowledge Synthesis**: Agents write deterministic summaries of their tool findings.
3. **Cross-Critique**: The `security` agent evaluates the `architect`'s proposal specifically looking for vulnerabilities. 
4. **Consensus**: The lead agent (or an aggregate router) compiles the final system output.

### Usage via CLI

```bash
# Simulates an entire team solving a problem
monult devteam "Migrate the MongoDB database to PostgreSQL"
```

### Usage via SDK

```typescript
import { AgentAssemblyEngine } from 'monult';

const agentAssembly = new AgentAssemblyEngine(monult);
const result = await agentAssembly.run({
  agents: ['architect', 'database', 'security'],
  task: 'Design the schema logic for a new authentication layer'
});
```

### When to use Agent Assembly:
- The task requires executing external tools (reading repos, fetching URLs, SQL queries).
- The task is vast and requires multi-domain expertise.
- You want the AI to iterate on errors directly rather than just generating text.
