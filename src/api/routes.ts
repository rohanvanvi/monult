// ─────────────────────────────────────────────────────────────
// Monult — REST API Routes
// ─────────────────────────────────────────────────────────────

import { Application, Request, Response } from 'express';
import { Monult } from '../index';

export function setupRoutes(app: Application, monult: Monult) {
    // Helper to get one model per active provider when no explicit models are requested
    const getDefaultModels = () => {
        return monult.sdk.listProviders().map(p => {
            const models = monult.sdk.listModels().filter(m => m.provider === p);
            return models.length > 0 ? models[0].id : p;
        });
    };

    // ── Status ──────────────────────────────────────────────
    app.get('/api/health', (_req: Request, res: Response) => {
        let version = '1.0.0';
        try {
            const pkg = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'package.json'), 'utf8'));
            version = pkg.version || '1.0.0';
        } catch (e) {}

        res.json({
            status: 'ok',
            version: version,
            uptime: process.uptime(),
            timestamp: Date.now(),
            providers: monult.sdk.listProviders(),
            agents: monult.agentRegistry.list().map(a => a.name),
        });
    });

    // ── API Docs ───────────────────────────────────────────
    app.get('/api/docs', (_req: Request, res: Response) => {
        let version = '1.0.0';
        try {
            const pkg = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'package.json'), 'utf8'));
            version = pkg.version || '1.0.0';
        } catch (e) {}

        res.json({
            name: 'Monult API',
            version: version,
            endpoints: [
                { method: 'GET', path: '/api/health', description: 'Health check' },
                { method: 'POST', path: '/api/generate', description: 'Generate AI response' },
                { method: 'POST', path: '/api/assembly', description: 'Run multi-model assembly' },
                { method: 'POST', path: '/api/debate', description: 'Run AI debate' },
                { method: 'GET', path: '/api/models', description: 'List available models' },
                { method: 'GET', path: '/api/providers', description: 'List configured providers' },
                { method: 'GET', path: '/api/agents', description: 'List available agents' },
                { method: 'POST', path: '/api/agents/:name/run', description: 'Run an agent' },
                { method: 'POST', path: '/api/route', description: 'Route a request to best model' },
                { method: 'POST', path: '/api/intent', description: 'Detect intent from text' },
                { method: 'POST', path: '/api/security/scan', description: 'Scan for security threats' },
                { method: 'GET', path: '/api/cost', description: 'Get cost analytics' },
                { method: 'GET', path: '/api/memory/stats', description: 'Memory statistics' },
                { method: 'POST', path: '/api/memory/recall', description: 'Recall relevant memories' },
                { method: 'POST', path: '/api/agent-assembly', description: 'Run multi-agent assembly' },
                { method: 'POST', path: '/api/hybrid-assembly', description: 'Run hybrid model+agent assembly' },
            ],
        });
    });

    // ── Generate ───────────────────────────────────────────
    app.post('/api/generate', async (req: Request, res: Response) => {
        try {
            const { prompt, model, provider, systemPrompt, maxTokens, temperature } = req.body;
            if (!prompt) {
                res.status(400).json({ error: 'prompt is required' });
                return;
            }

            const result = await monult.generate({
                prompt,
                model,
                provider,
                systemPrompt,
                maxTokens,
                temperature,
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    app.post('/api/generate/stream', async (req: Request, res: Response) => {
        try {
            const { prompt, model, provider, systemPrompt, maxTokens, temperature } = req.body;
            if (!prompt) {
                res.status(400).json({ error: 'prompt is required' });
                return;
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const result = await monult.generate({
                prompt,
                model,
                provider,
                systemPrompt,
                maxTokens,
                temperature,
                onChunk: (chunk: string) => {
                    res.write(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`);
                }
            });
            res.write(`data: ${JSON.stringify({ type: 'complete', response: result })}\n\n`);
            res.end();
        } catch (error) {
            if (!res.headersSent) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            } else {
                res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
                res.end();
            }
        }
    });

    // ── Assembly ───────────────────────────────────────────
    app.post('/api/assembly', async (req: Request, res: Response) => {
        try {
            const { prompt, models, debate, verify, rounds } = req.body;
            if (!prompt) {
                res.status(400).json({ error: 'prompt is required' });
                return;
            }

            const result = await monult.assembly({
                prompt,
                models: models || getDefaultModels(),
                debate: debate ?? true,
                verify: verify ?? true,
                rounds,
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    app.post('/api/assembly/stream', async (req: Request, res: Response) => {
        try {
            const { prompt, models, debate, verify, rounds } = req.body;
            if (!prompt) {
                res.status(400).json({ error: 'prompt is required' });
                return;
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            await monult.assembly({
                prompt,
                models: models || getDefaultModels(),
                debate: debate ?? true,
                verify: verify ?? true,
                rounds,
                onProgress: (event: any) => {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                }
            });
            res.end();
        } catch (error) {
            if (!res.headersSent) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            } else {
                res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
                res.end();
            }
        }
    });

    // ── Debate ─────────────────────────────────────────────
    app.post('/api/debate', async (req: Request, res: Response) => {
        try {
            const { topic, models, rounds } = req.body;
            if (!topic) {
                res.status(400).json({ error: 'topic is required' });
                return;
            }

            const result = await monult.assembly({
                prompt: topic,
                models: models || getDefaultModels(),
                debate: true,
                verify: false,
                rounds: rounds || 2,
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    app.post('/api/debate/stream', async (req: Request, res: Response) => {
        try {
            const { topic, models, rounds } = req.body;
            if (!topic) {
                res.status(400).json({ error: 'topic is required' });
                return;
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            await monult.assembly({
                prompt: topic,
                models: models || getDefaultModels(),
                debate: true,
                verify: false,
                rounds: rounds || 2,
                onProgress: (event: any) => {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                }
            });
            res.end();
        } catch (error) {
            if (!res.headersSent) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            } else {
                res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
                res.end();
            }
        }
    });

    // ── Models ─────────────────────────────────────────────
    app.get('/api/models', (_req: Request, res: Response) => {
        res.json({ models: monult.sdk.listModels() });
    });

    // ── Providers ──────────────────────────────────────────
    app.get('/api/providers', (_req: Request, res: Response) => {
        res.json({ providers: monult.sdk.listProviders() });
    });

    // ── Agents ─────────────────────────────────────────────
    app.get('/api/agents', (_req: Request, res: Response) => {
        res.json({ agents: monult.agentRegistry.list() });
    });

    app.post('/api/agents/:name/run', async (req: Request, res: Response) => {
        try {
            const { name } = req.params;
            const { input, description } = req.body;

            const agent = monult.agentRegistry.get(name);
            if (!agent) {
                res.status(404).json({ error: `Agent "${name}" not found` });
                return;
            }

            const result = await agent.run({
                id: `task-${Date.now()}`,
                description: description || `${name} task`,
                input: input || '',
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    // ── Router ─────────────────────────────────────────────
    app.post('/api/route', (req: Request, res: Response) => {
        try {
            const { prompt, strategy, maxCost, taskType } = req.body;
            if (!prompt) {
                res.status(400).json({ error: 'prompt is required' });
                return;
            }

            const result = monult.router.route(prompt, { strategy, maxCost, taskType });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    // ── Intent ─────────────────────────────────────────────
    app.post('/api/intent', (req: Request, res: Response) => {
        const { text } = req.body;
        if (!text) {
            res.status(400).json({ error: 'text is required' });
            return;
        }

        const result = monult.intentEngine.detect(text);
        res.json(result);
    });

    // ── Security ───────────────────────────────────────────
    app.post('/api/security/scan', (req: Request, res: Response) => {
        const { text, type } = req.body;
        if (!text) {
            res.status(400).json({ error: 'text is required' });
            return;
        }

        const result = type === 'code'
            ? monult.securityEngine.scanCode(text)
            : monult.securityEngine.scanPrompt(text);

        res.json(result);
    });

    // ── Cost ───────────────────────────────────────────────
    app.get('/api/cost', (_req: Request, res: Response) => {
        res.json({
            ...monult.costTracker.getSummary(),
            entries: monult.costTracker.getEntries(50)
        });
    });

    app.get('/api/cost/report', (_req: Request, res: Response) => {
        res.json({ report: monult.costTracker.getReport() });
    });

    // ── Memory ─────────────────────────────────────────────
    app.get('/api/memory/stats', (_req: Request, res: Response) => {
        res.json(monult.memory.stats());
    });

    app.post('/api/memory/recall', (req: Request, res: Response) => {
        const { query, layer, topK } = req.body;
        if (!query) {
            res.status(400).json({ error: 'query is required' });
            return;
        }

        const results = monult.memory.recall(query, layer, topK);
        res.json({ results });
    });

    app.post('/api/memory/store', (req: Request, res: Response) => {
        const { layer, key, value, metadata } = req.body;
        if (!layer || !key || !value) {
            res.status(400).json({ error: 'layer, key, and value are required' });
            return;
        }

        const entry = monult.memory.store(layer, key, value, metadata);
        res.json(entry);
    });

    // ── Agent Assembly ─────────────────────────────────────
    app.post('/api/agent-assembly', async (req: Request, res: Response) => {
        try {
            const { task, agents, enableCritique, enableImprovement } = req.body;
            if (!task) {
                res.status(400).json({ error: 'task is required' });
                return;
            }

            const result = await monult.agentAssembly({
                agents: agents || ['architect', 'security', 'devops'],
                task,
                enableCritique: enableCritique ?? true,
                enableImprovement: enableImprovement ?? true,
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    app.post('/api/agent-assembly/stream', async (req: Request, res: Response) => {
        try {
            const { task, agents, enableCritique, enableImprovement } = req.body;
            if (!task) {
                res.status(400).json({ error: 'task is required' });
                return;
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            await monult.agentAssembly({
                agents: agents || ['architect', 'security', 'devops'],
                task,
                enableCritique: enableCritique ?? true,
                enableImprovement: enableImprovement ?? true,
                onProgress: (event: any) => {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                }
            });
            res.end();
        } catch (error) {
            if (!res.headersSent) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            } else {
                res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
                res.end();
            }
        }
    });

    // ── Hybrid Assembly ────────────────────────────────────
    app.post('/api/hybrid-assembly', async (req: Request, res: Response) => {
        try {
            const { prompt, models, agents, systemPrompt } = req.body;
            if (!prompt) {
                res.status(400).json({ error: 'prompt is required' });
                return;
            }

            const result = await monult.hybridAssembly({
                models: models || monult.sdk.listProviders(),
                agents: agents || ['architect', 'security'],
                prompt,
                systemPrompt,
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
}