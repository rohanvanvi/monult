# Next.js Web Dashboard

## Overview

Monult comes with an extensive, beautifully designed Next.js web application to track orchestrations visually.

Instead of hunting through terminal logs, the Dashboard gives developers real-time views into token burn, active Model Debates, cost distributions, and Workspace metadata.

## Launching the Dashboard

When you start the Monult background server, it will automatically serve the API endpoint and boot the Next.js production build:

```bash
# Start both runtime and dashboard on ports 3000 and 3001
monult start
```

Access the dashboard natively at: `http://localhost:3001`

>[Screenshot Placeholder] A visual display showing token usage graphs, active AI orchestrations, model latencies, and total cost optimizations.

## Core Visualizations

### 1. Token Metrics
See detailed token breakdowns per-provider, identifying whether `claude` or `openai` is burning through context windows faster. Features bar graphs mapping request frequency over the last 24 hours.

### 2. Live Debate Viewer
When running a `AssemblyEngine` script with debate tracking enabled, the Dashboard displays logic trees in real-time. Watch as Model A critiques Model B, observing argument shifts visually until Consensus is reached.

### 3. Agent Terminal
Track `DevTeam` agents dynamically updating their internal thought loops. You can observe the Debugger agent invoking tools securely while the Architect maps out the codebase.

### 4. Cost Configuration
Input per-token pricing updates to configure the local Smart Router engine from the UI. Apply strict budgetary bounds or lock specific task classes to open-source Local models dynamically.
