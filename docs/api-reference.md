# API Reference

## Base URL

```text
http://localhost:3000/api
```

> **Note**: An interactive Swagger UI is available by visiting `http://localhost:3000/api/docs` in your browser while the `monult start` server is running.

## Endpoints

### Health Check

```http
GET /api/health
```

Returns server status, available providers, workspaces, and registered agents.

---

### Generate

```http
POST /api/generate
```

Generate a single AI response.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | The prompt text |
| `model` | string | | Specific model ID (leave blank for Router to decide) |
| `provider` | string | | Provider name (claude, openai, gemini, local) |
| `systemPrompt` | string | | System instruction |
| `workspaceId` | string | | ID of workspace for context memory isolation |

---

### Assembly

```http
POST /api/assembly
```

Run a Multi-Model Debate Assembly.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | The prompt text |
| `models` | string[] | | Provider names to use (`['claude', 'openai']`) |
| `debate` | boolean | | Enable debate mode |
| `verify` | boolean | | Enable automated verification stage |
| `workspaceId`| string | | ID of workspace |

---

### Hybrid Assembly (New API)

```http
POST /api/hybrid-assembly
```

Run a collaborative Hybrid Model + Agent Assembly.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | The prompt text |
| `models` | string[] | ✅ | Provider names to draft reasoning |
| `agents` | string[] | ✅ | Agent names to execute domain critique |
| `workspaceId`| string | | ID of workspace context |

---

### Smart Router

```http
POST /api/route
```

Get an optimal model recommendation based on heuristics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | The prompt to analyze |
| `strategy` | string | | `performance`, `cost`, `balanced`, or `quality` |
| `maxCost` | number | | Maximum cost per 1k tokens budget |

---

### Intent Engine

```http
POST /api/intent
```

Analyze unstructured text to extract user intent.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✅ | Text to analyze for intent |

---

### Agents

```http
GET /api/agents              # List all agents
POST /api/agents/:name/run   # Run an agent
```

Run body:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input` | string | ✅ | Input for the agent |
| `workspaceId`| string | | Isolate agent memory to specific workspace ID |

---

### Security Engine

```http
POST /api/security/scan
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✅ | Text to scan |
| `type` | string | | `prompt` or `code` |

---

### Cost Optimization & Tracking

```http
GET /api/cost          # Gross token cost summary
GET /api/cost/report   # Formatted breakdown report per provider & model
```

---

### Workspace & Memory Management

```http
POST /api/workspaces          # Create a new workspace
GET  /api/workspaces          # List workspaces
GET  /api/workspaces/:id      # Get workspace metadata
GET  /api/memory/stats        # Global Memory statistics
POST /api/memory/recall       # Recall memories (requires workspace ID in payload)
POST /api/memory/store        # Store a memory manually
```

---

## SDK & CLI Reference

While the REST API handles programmatic executions, the **Monult Universal SDK** exposes the native OS interface directly into your Node projects:

### Hybrid Assembly execution
```typescript
const result = await monult.hybridAssembly({
    models: ['claude', 'openai'],
    agents: ['architect', 'security'],
    prompt: 'Design scalable auth'
});
console.log(result.consensus);
```

### DevTeam Simulation (Multi-Agent framework)
```typescript
const devteamResult = await monult.devteam(
    'Build a microservice for email queues'
);
```

### Declarative Workflow Engine
```typescript
const output = await monult.workflows.run({
    name: "My Workflow",
    nodes: [...] // Deterministic JSON steps for pipelines
});
```
