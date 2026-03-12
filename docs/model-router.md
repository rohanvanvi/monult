# Smart Model Router & Cost Optimization

## Overview

Sending every task to GPT-4o or Claude 3.5 Sonnet is incredibly expensive and slow. The Monult **Smart Router** coupled with the **Cost Optimizer** uses heuristics to intelligently downgrade or upgrade the chosen model based on the complexity of the prompt and your budget constraints.

## Smart Router (`src/core/router.ts`)

When you run a standard `generate()` or `ask` command without specifying a model, the Router takes over.

### Task Type Detection
The router analyzes the payload and categorizes it:
1. **Simple** (e.g., "What is a boolean?") → Routes to **Local** or **Claude Haiku**.
2. **Code** (e.g., "Write a RegEx for emails") → Routes to **Claude 3.5 Sonnet** (Code specialist).
3. **Creative** (e.g., "Write an article") → Routes to **Gemini**.
4. **Complex** (e.g., "Design a distributed system") → Routes to **OpenAI o3** or **Claude Opus**.

### Strategies

You can force a default strategy globally via `~/.monult/config.json`:

```json
{
  "routingStrategy": "cost" // Options: cost, performance, balanced, quality
}
```

- `cost`: Always picks the cheapest model capable of the task.
- `performance`: Always picks the model with the lowest historical Latency ms.
- `balanced`: The default. Factorizes both cost budget and token speed.
- `quality`: Ignores cost and latency, strictly picking the most powerful reasoning engine.

## Cost Optimizer (`src/core/cost-optimizer.ts`)

The Cost Optimizer wraps the execution engine, tracking every single Token chunk in real-time. 

### Budget Enforcement

You can prevent large runaway loops inside Agent Assemblies by passing a hard budget wall:

```typescript
import { CostOptimizer } from 'monult';

// Restrict this specific request array to $0.05
const route = await costOptimizer.optimizeRoute({
  taskComplexity: 0.8,
  budget: 0.05,
  models: ['claude', 'openai']
});
```

### Dashboard Analytics

All token burn is aggregated logically and piped to the Next.js Dashboard. You can view:
- Top spending providers.
- Most expensive Agents.
- Daily/Weekly burn downs.

## API Endpoint Usage

If you are building your own tools, you can query the router directly to ask what it *would* use before actually executing logic.

```bash
curl -X POST http://localhost:3000/api/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Fix a spelling error in this paragraph.", "strategy": "cost"}'

# Response:
# { "recommendedModel": "llama-3.1-8b-local", "estimatedCost": "$0.00" }
```
