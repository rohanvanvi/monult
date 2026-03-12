# Architecture Overview

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              Monult Runtime                            │
├──────────┬──────────────────────────────┬──────────────────────────────┤
│   CLI    │ REST API (Swagger UI Docs)   │  Next.js Web Dashboard       │
├──────────┴──────────────────────────────┴──────────────────────────────┤
│                           Universal Monult SDK                         │
├────────────────────────────────────────────────────────────────────────┤
│                       Workspace & Config Manager                       │
├────────────────────────────────────────────────────────────────────────┤
│  Model Assembly │ Agent Assembly │ Hybrid Assembly │ Cost  │ Benchmark │
├────────────────────────────────────────────────────────────────────────┤
│  Workflow Engine│  Debate System │ Consensus Engine│ Smart Router      │
├─────────────────┴───────────┬────┴─────────────────┴───────────────────┤
│  Intent Engine  │ Security  │            Memory / Context Manager      │
│                 │           │        Vector Store │ Layered Context     │
├─────────────────┴───────────┴──────────────────────────────────────────┤
│                       Agent Framework                                  │
│  Debugger │ Architect │ Security │ DevOps │ Docs                       │
├────────────────────────────────────────────────────────────────────────┤
│                         Tool Layer                                     │
│  Code Analyzer │ Web Search │ Repo Reader │ DB Analyzer │ FS Tools     │
├────────────────────────────────────────────────────────────────────────┤
│                     Provider Adapters                                  │
│  Claude │ OpenAI │ Gemini │ Cohere │ Local │ Custom                    │
└────────────────────────────────────────────────────────────────────────┘
```

## Module Descriptions

### Core Engine (`src/core/`)

| Module | Purpose |
|--------|---------|
| `sdk.ts` | Universal API for all providers. Provider auto-detection, multi-generate, dynamic registration. |
| `assembly.ts` | Multi-model collaboration. Propose → Critique → Improve → Verify → Merge. |
| `agent-assembly.ts` | Multi-agent collaboration. Agents Propose → Critique → Improve → Consensus. |
| `hybrid-assembly.ts` | Model + Agent collaboration. Models reason natively while Agents provide domain critique. |
| `debate.ts` | Structured multi-round arguments between differing models to find edge cases. |
| `consensus.ts` | Voting, weighted scoring, and confidence-based selection algorithm. |
| `router.ts` | Task-type detection and optimal model selection (e.g. `mini` models for simple tasks). |
| `cost-optimizer.ts`| Enforces token budgets and automatically downgrades/upgrades models based on task payload. |
| `benchmark.ts` | Tracks live latency, token generation speeds, and response heuristics. |
| `intent.ts` | Developer intent classification from natural language input. |
| `workspace-manager.ts`| Isolates projects logically, storing separate context, memories, and configurations per workspace. |

### Providers (`src/providers/`)

Providers implement `BaseProvider` with standardized methods:
- `generate(request)`
- `multiGenerate(request)`
- `listModels()`

Built-in providers: **Claude**, **OpenAI**, **Gemini**, **Cohere**, **Local (Ollama)**.
Custom providers can be hooked in smoothly via `monult.registerProvider()`.

### Memory & Workspaces (`src/memory/`, `src/core/workspace-manager.ts`)

| Layer | Purpose | Persistence |
|-------|---------|-------------|
| `conversation` | Chat history per session | In-memory + Vector |
| `project` | File structure, dependencies, pattern isolation | Vector Store (Workspace Scoped) |
| `tool` | Tool execution results and learned methodologies | Vector Store (Workspace Scoped) |
| `knowledge` | Long-term learned facts from repository scans | Vector Store (Workspace Scoped) |

### Agents (`src/agents/`)

Each agent extends `BaseAgent` and implements an advanced ReAct (Reason + Act) loop:
1. **Analyze** context and user intent.
2. **Execute** dedicated tool executions.
3. **Refine** logic based on environment observation.
4. **Produce** output to memory or caller.

### Security (`src/security/`)

Proactively intercepts user inputs and model outputs spanning:
- Prompt injection vectors & escapes.
- API key / secret credential leaks.
- Malicious reverse shells or rm -rf commands.
- Sub-dependency vulnerabilities.

## Data Flow Pipeline

```text
User Request
  │
  ├── Intent Engine → Detects "What is the user trying to do?"
  ├── Security Engine → Scans prompt for injection attempts
  ├── Workspace Manager → Loads contextual project memory
  ├── Smart Router / Cost Optimizer → Determines optimal execution model/path
  │
  ├── [Simple Request] ──→ SDK.generate() ──→ Output
  │
  ├── [Model Assembly] ──→ Assembly Engine
  │                         ├── Stage 1: Proposal (e.g., Claude, OpenAI)
  │                         ├── Stage 2: Critique (Identify weaknesses)
  │                         ├── Stage 3: Improvement (Refine original answer)
  │                         ├── Stage 4: Debate (Argue variations if needed)
  │                         ├── Stage 5: Verification (Run sanity checks)
  │                         └── Stage 6: Consensus → Final Output
  │
  ├── [Agent Assembly] ──→ Agent Assembly Engine
  │                         ├── Phase 1: Agents execute specialized tools (FS, Search)
  │                         ├── Phase 2: Agents synthesize tool outputs
  │                         ├── Phase 3: Cross-Agent critique
  │                         └── Phase 4: Consensus → Final Output
  │
  └── [Hybrid Assembly] ──→ Hybrid Assembly Engine
                            ├── Phase 1: Models draft raw architectural plans
                            ├── Phase 2: Agents inject domain facts (e.g., Security logic)
                            ├── Phase 3: Models refactor using Agent feedback
                            └── Phase 4: Consensus → Final Output
```
