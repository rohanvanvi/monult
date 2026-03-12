# Agents Guide

## Overview

Monult agents are autonomous AI workers designed to reason, select tools, and execute multi-step deterministic tasks using a highly structured ReAct (Reason + Act) flow.

Unlike standard language models, Agents are configured with specific domain knowledge and have runtime access to a tool suite covering filesystems, databases, and network requests.

## Built-in Core Agents

Monult ships with highly specialized built-in agents:

| Agent | CLI Syntax | Domain Responsibility |
|-------|------------|-----------------------|
| `debugger` | `monult agent run debugger` | Root-cause analysis, stack trace reading, proposing logic fixes |
| `architect`| `monult agent run architect`| System design, design pattern generation, architecture review |
| `security` | `monult agent run security` | Vulnerability scanning, code injection audits, API key leaking |
| `devops`   | `monult agent run devops`   | CI/CD pipeline writing, deployment scripting, infrastructure-as-code |
| `docs`     | `monult agent run docs`     | Automatic inline documentation generation, Swagger specification |
| `frontend` | `monult agent run frontend` | UI/UX implementation, layout heuristics, styling code |
| `backend`  | `monult agent run backend`  | API route definitions, database schema planning, heavy business logic |
| `performance`|`monult agent run performance`| Scalability profiling, query logic optimization, Big O verification |

## AI Simulation via `monult devteam`

You can run an interconnected group of agents through a simulation command called DevTeam. In this flow, agents organically pass context between each other.
```bash
monult devteam "Build a scalable auth system"
```

## Creating Custom Agents

Extensibility is core to Monult. Build agents by extending `BaseAgent`:

```typescript
import { BaseAgent, AgentStep } from 'monult';

class CustomDomainAgent extends BaseAgent {
  constructor(sdk, memory) {
    super(sdk, memory, {
      name: 'domain-agent',
      description: 'Does something highly specific to my business',
      systemPrompt: 'You are an expert at...',
    });
  }

  protected async think(context, previousSteps, iteration) {
    // 1. Analyze Context
    const payload = `Analyze this intent: ${context}`;
    
    // 2. Query Model
    const response = await this.sdk.generate({
      prompt: payload,
      systemPrompt: this.config.systemPrompt,
    });

    // 3. Optional Tool Invocation Check here
    
    // 4. Return formatted Agent step tracking
    return {
      iteration,
      thought: `[REASONING] ${response.content}`,
      action: 'FINISH',
      observation: response.content,
      timestamp: Date.now(),
    };
  }
}

// Register inside initialization
monult.agentRegistry.register(new CustomDomainAgent(monult.sdk, monult.memory));
```

## Agent Lifecycle Execution Pipeline

```text
[TASK START]
  1. Receive original prompt & workspace identifier.
  2. Think → Generate contextual reasoning based on history.
  3. Search → Can I execute a tool to gain context? (Optional)
  4. Act → Execute tool and capture outputs natively.
  5. Observe → Process tool result mentally.
  6. Loop → Repeat Steps 2-5 until confidence threshold met or max iterations reached.
  7. Return → Push `AgentResult` object array up the chain.
[TASK END]
```
