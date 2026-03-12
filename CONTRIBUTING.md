# Contributing to Monult

Thank you for your interest in contributing to Monult! We welcome contributions from everyone to help build the ultimate multi-model AI operating system for developers.

This guide will help you understand the project structure, how to set up your development environment, and how to create essential modular pieces like Providers, Agents, Tools, and Plugins.

---

## 🛠️ Project Setup

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/monult.git
   cd monult
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build the project** (creates the `dist/` folder):
   ```bash
   npm run build
   ```
5. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-awesome-feature
   ```

---

## 🔄 Development Workflow

To test the CLI and core engine while developing:

```bash
# Watch mode for TypeScript (run in a separate terminal)
npm run build -- -w

# Execute the local CLI (instead of the globally installed one)
npm run dev -- ask "What is Monult?"
npm run dev -- agent run debugger

# Run tests
npm test

# Run the local Next.js Dashboard
npm run dashboard
```

---

## 📝 Code Style Rules

- **Language:** We use TypeScript exclusively for core logic.
- **Strict Typing:** All variables, parameters, and return types MUST be strictly typed. Avoid `any` wherever possible.
- **Naming Conventions:**
  - Files & Folders: `kebab-case` (`agent-assembly.ts`)
  - Classes: `PascalCase` (`HybridAssemblyEngine`)
  - Variables/Functions: `camelCase` (`runAssembly()`)
- **Documentation:**
  - Use JSDoc comments for public classes, interfaces, and methods.
- **Modularity:** Keep files focused. If a file exceeds 500 lines, it should likely be split into smaller, domain-driven modules.

---

## 🏗️ Extending Monult

One of Monult's greatest strengths is its modularity. You can easily add functionality by extending base classes.

### 1. How to Add an AI Provider

Want to add a new AI API (e.g., Hugging Face, Anthropic, DeepSeek)?

1. Create a new file in `src/providers/your-provider.ts`
2. Extend the `BaseProvider` class from `src/providers/base.ts`:
   ```typescript
   import { BaseProvider, GenerateRequest, GenerateResponse, ModelProfile } from './base';

   export class YourProvider extends BaseProvider {
       constructor(config) { super(config); }
       
       async generate(request: GenerateRequest): Promise<GenerateResponse> {
           // Implement API call logic here
       }

       listModels(): ModelProfile[] {
           return [{ id: 'your-model-1', name: 'Your Model v1', provider: 'your-provider' }];
       }
   }
   ```
3. Register it in the `UniversalSDK` inside `src/core/sdk.ts`.

### 2. How to Create an Agent

Agents are specialized entities optimized for specific developer tasks.

1. Create a file in `src/agents/your-agent.ts`
2. Extend the `BaseAgent` class:
   ```typescript
   import { BaseAgent, AgentContext, AgentResponse } from './base';

   export class YourAgent extends BaseAgent {
       constructor() {
           super({
               id: 'your-agent',
               name: 'Your Agent Name',
               description: 'What this agent does',
               capabilities: ['capability1', 'capability2']
           });
       }

       async execute(task: string, context?: AgentContext): Promise<AgentResponse> {
           // Implement agent reasoning and tool usage here
       }
   }
   ```
3. Register the agent inside `src/agents/registry.ts`.

### 3. How to Create a Tool

Tools give Agents the ability to interact with the environment (fs, web, db).

1. Create a file in `src/tools/your-tool.ts`
2. Extend the `BaseTool` class:
   ```typescript
   import { BaseTool, ToolContext, ToolResponse } from './base';

   export class YourTool extends BaseTool {
       constructor() {
           super({
               name: 'yourTool',
               description: 'What this tool does',
               parameters: {
                   type: 'object',
                   properties: {
                       param1: { type: 'string', description: 'Parameter description' }
                   },
                   required: ['param1']
               }
           });
       }

       async execute(input: any, context?: ToolContext): Promise<ToolResponse> {
           // Implement tool execution logic here
       }
   }
   ```

### 4. How to Add a Plugin

Plugins allow developers to share entire custom toolkits, commands, and providers as an importable module.

1. Create your plugin inside `src/plugins/your-plugin.ts`
2. Implement the `MonultPlugin` interface:
   ```typescript
   import { MonultPlugin, PluginContext } from './base';

   export class YourPlugin implements MonultPlugin {
       name = 'Your Plugin Name';
       version = '1.0.0';

       async initialize(context: PluginContext): Promise<void> {
           // Register custom providers, tools, or commands here
       }
   }
   ```
3. Test your plugin using `$ monult plugin install <path>`.

---

## ✅ Pull Request Process

1. Ensure your code satisfies all **Code Style Rules**.
2. Add comprehensive unit tests if you are implementing core logic.
3. Make sure `npm run build` and `npm test` execute without errors.
4. If your PR introduces a new CLI command or core API change, update the `docs/` folder accurately.
5. Provide a clear, detailed PR description explaining what was added or fixed and *why* it was necessary.

---

## 🙋 Reporting Issues

If you find a bug or have a feature request, please use GitHub Issues:
- Describe the issue clearly.
- Provide the exact steps to reproduce.
- Include the expected vs. actual behavior.
- Mention your execution environment (Node v18+, OS, CLI vs SDK).

---

## 🤝 Code of Conduct

Monult expects all contributors to be respectful, inclusive, and highly constructive. We are building the future of AI orchestration together — act like a team!

---

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the **Apache License 2.0**.
