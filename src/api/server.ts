// ─────────────────────────────────────────────────────────────
// Monult — REST API Server
// ─────────────────────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import { Monult } from '../index';
import { setupRoutes } from './routes';

export class MonultServer {
    private app: express.Application;
    private monult: Monult;

    constructor() {
        this.app = express();
        this.monult = new Monult();
        this.setup();
    }

    private setup(): void {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.static('dashboard'));

        // Request logging
        this.app.use((req, _res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });

        setupRoutes(this.app, this.monult);
    }

    start(port: number = 3000, host: string = 'localhost'): void {
        this.app.listen(port, host, () => {
            console.log('');
            console.log('  🧠 Monult API Server');
            console.log(`  ├─ API:       http://${host}:${port}/api`);
            console.log(`  ├─ Dashboard: http://${host}:${port}/`);
            console.log(`  ├─ Health:    http://${host}:${port}/api/health`);
            console.log(`  └─ Docs:      http://${host}:${port}/api/docs`);
            console.log('');
            console.log('  Available providers:', this.monult.sdk.listProviders().join(', ') || 'none configured');
            console.log('  Available agents:', this.monult.agentRegistry.list().map(a => a.name).join(', '));
            console.log('');
        });
    }
}