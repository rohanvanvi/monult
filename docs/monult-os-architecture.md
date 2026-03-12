# Monult OS Architecture

Monult is designed as a Multi-Model AI Operating System. Instead of a standard library that makes single API calls, Monult provides a comprehensive runtime environment where AI models, agents, tools, and memory systems collaborate.

## Core Layers

### 1. User Interface Layer
- **CLI (`monult`)**: The primary interface for developers to chat, ask questions, run agents, trigger workflows, and analyze repositories.
- **REST API**: Exposes Monult OS capabilities to external applications.
- **Dashboard**: A graphical control panel visualising running assemblies, active agents, cost metrics, and memory states.

### 2. Runtime Layer
- **Assembly Engine**: Orchestrates multiple models in structured pipelines (Propose → Critique → Improve → Verify → Consensus).
- **Agent/Hybrid Assembly**: Combines specialized AI agents (Architect, Security, DevOps) and models to solve complex tasks collaboratively.
- **Task Scheduler (Workflows)**: Executes predefined pipelines of AI actions (e.g., repo analysis → bug finding → PR generation).
- **Consensus & Debate**: Resolves disagreements between AI models and selects the highest-confidence output.

### 3. Intelligence Layer
- **Smart Router & Cost Optimizer**: Analyzes user prompts and automatically routes them to the most appropriate AI model based on required capability, latency constraints, and cost thresholds.
- **Intent Engine**: Classifies developer instructions to trigger the right subsystems automatically.
- **Assembly Graph**: Tracks the lineage of reasoning across models and agents, providing a verifiable "thought process" for every consensus decision.

### 4. Execution Layer
- **Tools**: Sandboxed functions that agents can call (e.g., Code Analysis, Web Search, Database Analysis).
- **Plugin System**: Allows developers to install third-party skills, agents, and commands into the Monult OS runtime dynamically.

### 5. Storage / Memory Layer
- **Vector Store**: Provides semantic search over embeddings.
- **Multi-Layer Memory**:
  - *Conversation*: Short-term chat history.
  - *Project*: Repository context, architecture files, and codebase structure.
  - *Tool*: Cache of previous tool executions and results.
  - *Knowledge*: Long-term persistent facts and developer preferences.

---

## OS Runtime Data Flow

```
[ Developer Input ] ──→ CLI / API / Dashboard
                              │
                    ┌─────────▼─────────┐
                    │   Intent Engine   │ ──(Determines Task Type)
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Cost Optimizer   │ ──(Selects Models/Agents)
                    └─────────┬─────────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
[Single Gen]            [Assemblies]            [Workflows]
 SDK Wrapper         Model / Agent / Hybrid    Pipeline Engine
      │                       │                       │
      └───────────────────────┼───────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Assembly Graph DB │ ──(Records Reasoning)
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Consensus Engine  │ ──(Selects Winner)
                    └─────────┬─────────┘
                              │
      ┌───────────────────────┴───────────────────────┐
      │                       │                       │
[ Memory Update ]    [ Response Return ]        [ Dashboard Update ]
```
