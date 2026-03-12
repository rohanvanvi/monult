# Plugin Development Guide

## Overview

Monult natively supports modular plugins via the `PluginRegistry`. Plugins can securely register custom **tools**, entirely new **providers**, and specialized **agents**, enabling you to deeply extend the core operating system without modifying the source code.

## Package Management via CLI

The fastest way to install, update, or remove plugins is via the Monult CLI.

```bash
# List all active and registered plugins
monult plugin list

# Install a community plugin (via npm packages or local paths)
monult plugin install @monult/jira-agent

# Remove a plugin and cleanly dereference it
monult plugin remove @monult/jira-agent
```

## Developing Custom Plugins

To write a plugin, implement the `MonultPlugin` interface:

```typescript
import { MonultPlugin, PluginContext, BaseProvider, BaseTool } from 'monult';

export class CustomEnterprisePlugin implements MonultPlugin {
    name = 'enterprise-toolkit';
    version = '1.0.0';

    async initialize(context: PluginContext): Promise<void> {
        // 1. Register a proprietary internal tool
        context.registry.tools.register(new InternalJiraTool());
        
        // 2. Register a heavily fine-tuned local model endpoint
        context.registry.providers.register('internal-llama', new LocalProviderConfig());
        
        // 3. Register a specialized corporate Agent
        context.registry.agents.register(new SecurityPolicyAgent());
        
        console.log(`[Plugin] Successfully mounted ${this.name} v${this.version}`);
    }
}
```

## Creating a Specialized Tool

Extend `BaseTool` to provide your agents with specific API hooks:

```typescript
import { BaseTool, ToolResult } from 'monult';

class InternalJiraTool extends BaseTool {
  constructor() {
    super('jira', 'Interact with corporate Jira ticketing system', [
      { name: 'ticketId', type: 'string', description: 'Ticket number (e.g., PROJ-123)', required: true },
      { name: 'action', type: 'string', description: 'Action: read, update, transition', required: true }
    ]);
  }

  async execute(input: { ticketId: string, action: string }): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Custom business logic
      const response = await fetch(`https://jira.internal.corp/api/${input.ticketId}`);
      const data = await response.json();
      
      return this.success('Successfully retrieved Jira data.', data, Date.now() - startTime);
      
    } catch (error) {
      return this.failure(`Jira API failed: ${error.message}`, Date.now() - startTime);
    }
  }
}
```

## Built-in Standard Tools

Monult provides robust tools natively:

| Tool | Core Responsibility |
|------|---------------------|
| `code-analyzer` | Computes project complexity, LOC, cyclomatic scores, unused variables |
| `web-search` | Automated SERP querying and content summarization (Requires API keys) |
| `repo-reader` | Scans directory structures, extracts dependency trees (`package.json`) |
| `doc-parser` | Parses Markdown, TSDoc, and auto-generates structured JSON summaries |
| `fs` | Native filesystem interaction to securely read/write inside active bounds |
| `db-analyzer` | Infers REST patterns and safely queries DB schema metadata |

## Tool Interface

Tools strictly adhere to the `ToolResult` typing to guarantee Agent predictability:

```typescript
interface ToolResult {
  output: string;    // Human-readable formatted output to push to models
  success: boolean;  // Boolean flag marking API 200 or internal success
  data?: unknown;    // High-fidelity structured JSON mapping
  error?: string;    // Raw error messages for Debugger agent evaluation
  latency: number;   // Required execution MS tracking for Optimization routing
}
```

## Design Patterns

1. **Isolation** — Ensure tools have a singular responsibility pattern.
2. **Resilience** — Capture edge cases using `try-catch` blocks and `this.failure()`.
3. **Data Quality** — Ensure data returned in the `output` string is heavily truncated and relevant to avoid overwhelming token limits for models.
