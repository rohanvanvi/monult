# Hybrid Assemblies

## The Grand Unification of Models and Agents

Monult introduces the **Hybrid Assembly Engine**, representing the bleeding edge of AI orchestration. It seamlessly intertwines the broad reasoning capabilities of LLMs with the highly-specialized, deterministic execution loops of Agents.

## How It Works

A `HybridAssemblyEngine` flow runs in distinct cyclic phases:

1. **The Vision (Model Layer)**: A powerful model (like GPT-4o) drafts a massive, high-level structural answer based on the prompt.
2. **The Execution (Agent Layer)**: Domain agents dissect the draft. The `security` agent scans the draft for injection vulnerabilities, while the `architect` agent uses the `code-analyzer` tool to ensure the proposed structures exist in the local project repository.
3. **The Refactoring (Model Layer)**: The original model receives the hard, factual critique from the agents and refactors the reasoning. 
4. **Consensus**: The engine validates the hybrid pipeline via a final vote.

### Why Hybrid?

- Pure Model Assemblies hallucinate because they lack real-world environment access.
- Pure Agent Assemblies lose sight of the big picture because they hyper-fixate on specific tool execution branches.
- **Hybrid Assemblies fix both.** Models dream the architecture; Agents build and verify the foundation.

## CLI Usage

Run a Hybrid pipeline by combining the `-m` (models) and `-a` (agents) flags.

```bash
monult hybrid-assembly "Design and securely implement an Express authentication flow" -m claude,openai -a architect,security
```

*In this scenario, Claude and OpenAI debate the Express design, while the Architect and Security agents execute tools against the local repository to ensure the code fits safely.*

## SDK Usage

```typescript
import { HybridAssemblyEngine } from 'monult';

const hybrid = new HybridAssemblyEngine(monult);

const result = await hybrid.run({
  models: ['claude', 'gemini'],
  agents: ['devops', 'security'],
  prompt: 'Write a deployable CI/CD YAML script for AWS Elastic Beanstalk with strict security policies.'
});

console.log(result.consensus);
console.log(result.agentFeedbackTraces);
```

## Configuring Hybrid Ratios

By default, the Hybrid engine assigns a `0.6` weighting to the Models and a `0.4` weighting to the Agents when calculating the Consensus score. You can inject a custom `ConsensusConfig` to modify these confidence bounds if you trust your internal tools more than the external models.
