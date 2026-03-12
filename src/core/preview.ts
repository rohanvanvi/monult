/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface PreviewStatus {
    running: boolean;
    url?: string;
    port?: number;
    processId?: number;
    workspace?: string;
}

export class PreviewEngine {
    private previewProcess: ChildProcess | null = null;
    private previewPort: number = 3000;
    private previewUrl: string = '';

    /**
     * Start preview server for a workspace
     */
    async start(workspace: string): Promise<{ url: string; port: number }> {
        try {
            // Stop any existing preview
            if (this.previewProcess) {
                await this.stop();
            }

            // Determine the preview command based on the project type
            const previewCommand = await this.detectPreviewCommand(workspace);
            
            if (!previewCommand) {
                throw new Error('No suitable preview command found for this project type');
            }

            // Start the preview process
            this.previewProcess = spawn('npm', ['run', previewCommand], {
                cwd: workspace,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Listen for output to detect when server is ready
            let serverReady = false;
            const stdoutChunks: string[] = [];
            const stderrChunks: string[] = [];

            this.previewProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                stdoutChunks.push(output);
                
                // Look for common server ready messages
                if (!serverReady) {
                    if (output.includes('localhost:') || output.includes('http://')) {
                        const urlMatch = output.match(/(https?:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+)/);
                        if (urlMatch) {
                            this.previewUrl = urlMatch[1];
                            serverReady = true;
                        }
                    }
                }
            });

            this.previewProcess.stderr?.on('data', (data) => {
                stderrChunks.push(data.toString());
            });

            this.previewProcess.on('close', (code) => {
                console.log(`Preview process exited with code ${code}`);
                this.previewProcess = null;
                this.previewUrl = '';
            });

            // Wait for server to be ready or timeout after 30 seconds
            const startTime = Date.now();
            const timeout = 30000;

            while (!serverReady && (Date.now() - startTime) < timeout) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (!serverReady) {
                throw new Error('Preview server failed to start within 30 seconds');
            }

            return {
                url: this.previewUrl,
                port: this.extractPortFromUrl(this.previewUrl)
            };

        } catch (error) {
            console.error('Preview start error:', error);
            throw error;
        }
    }

    /**
     * Stop the preview server
     */
    async stop(): Promise<{ success: boolean }> {
        try {
            if (this.previewProcess) {
                this.previewProcess.kill('SIGTERM');
                
                // Wait a bit for graceful shutdown
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Force kill if still running
                if (!this.previewProcess.killed) {
                    this.previewProcess.kill('SIGKILL');
                }
                
                this.previewProcess = null;
                this.previewUrl = '';
            }

            return { success: true };
        } catch (error) {
            console.error('Preview stop error:', error);
            throw error;
        }
    }

    /**
     * Get current preview status
     */
    async getStatus(): Promise<PreviewStatus> {
        return {
            running: this.previewProcess !== null,
            url: this.previewUrl || undefined,
            port: this.previewUrl ? this.extractPortFromUrl(this.previewUrl) : undefined,
            processId: this.previewProcess?.pid,
        };
    }

    /**
     * Detect the appropriate preview command for a project
     */
    private async detectPreviewCommand(workspace: string): Promise<string | null> {
        const packageJsonPath = path.join(workspace, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return null;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};

            // Check for common preview commands
            const previewCommands = [
                'dev',
                'start',
                'preview',
                'serve',
                'watch'
            ];

            for (const command of previewCommands) {
                if (scripts[command]) {
                    return command;
                }
            }

            // Check for framework-specific commands
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            if (dependencies.next) return 'dev';
            if (dependencies.vite) return 'dev';
            if (dependencies['@vitejs/plugin-react']) return 'dev';
            if (dependencies['@vitejs/plugin-vue']) return 'dev';
            if (dependencies['@11ty/eleventy']) return 'start';
            if (dependencies['@vue/cli-service']) return 'serve';
            if (dependencies['@angular/cli']) return 'start';
            if (dependencies['@sveltejs/kit']) return 'dev';
            if (dependencies['@remix-run/dev']) return 'dev';
            if (dependencies['astro']) return 'dev';

            return null;
        } catch (error) {
            console.error('Failed to parse package.json:', error);
            return null;
        }
    }

    /**
     * Extract port number from URL
     */
    private extractPortFromUrl(url: string): number {
        const match = url.match(/:(\d+)/);
        return match ? parseInt(match[1], 10) : 3000;
    }
}