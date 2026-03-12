/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Filesystem Agent Tools
// ─────────────────────────────────────────────────────────────

import { BaseTool, ToolResult } from './base';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DevTeamEvent } from '../core/devteam';

export class CreateFolderTool extends BaseTool {
    private workspace: string;
    private agentName: string;
    private onProgress?: (event: DevTeamEvent) => void;

    constructor(workspace: string, agentName: string, onProgress?: (event: DevTeamEvent) => void) {
        super(
            'create_folder',
            'Creates a new folder in the workspace. Example input: src/components',
            [{ name: 'folderPath', type: 'string', description: 'Path to folder (relative to workspace)', required: true }]
        );
        this.workspace = workspace;
        this.agentName = agentName;
        this.onProgress = onProgress;
    }

    async execute(input: string): Promise<ToolResult> {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                // Ensure the path strings aren't weirdly quoted
                const folderPath = input.replace(/^['"]|['"]$/g, '').trim();
                const fullPath = path.join(this.workspace, folderPath);

                // Basic security path traversal check
                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot create directory outside workspace`, Date.now() - startTime));
                }

                await fs.mkdir(fullPath, { recursive: true });
                return resolve(this.success(`Folder created at ${folderPath}`, { path: folderPath }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error creating folder: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}

export class CreateFileTool extends BaseTool {
    private workspace: string;
    private agentName: string;
    private onProgress?: (event: DevTeamEvent) => void;

    constructor(workspace: string, agentName: string, onProgress?: (event: DevTeamEvent) => void) {
        super(
            'create_file',
            'Creates a new file with the specified content. Input format should be a JSON string with "path" and "content" properties. Example: {"path": "index.js", "content": "console.log(\'hello\');"}',
            [
                { name: 'path', type: 'string', description: 'File path relative to workspace', required: true },
                { name: 'content', type: 'string', description: 'File content', required: true }
            ]
        );
        this.workspace = workspace;
        this.agentName = agentName;
        this.onProgress = onProgress;
    }

    async execute(input: string): Promise<ToolResult> {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                let parsed: { path: string, content: string };
                try {
                    parsed = JSON.parse(input);
                } catch (e) {
                    // Try to handle raw input if they just sent a valid json layout manually
                    return resolve(this.failure(`Invalid JSON input format`, Date.now() - startTime));
                }

                if (!parsed.path || typeof parsed.content !== 'string') {
                    return resolve(this.failure(`Input must contain "path" and "content"`, Date.now() - startTime));
                }

                const fullPath = path.join(this.workspace, parsed.path);

                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot write file outside workspace`, Date.now() - startTime));
                }

                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, parsed.content, 'utf8');

                this.onProgress?.({
                    type: 'file_created',
                    agent: this.agentName,
                    data: { filename: parsed.path, path: fullPath },
                    timestamp: Date.now()
                });

                return resolve(this.success(`File successfully created at ${parsed.path}`, { path: parsed.path }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error creating file: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}

export class ReadFileTool extends BaseTool {
    private workspace: string;

    constructor(workspace: string) {
        super(
            'read_file',
            'Reads the content of an existing file. Example input: src/index.js',
            [{ name: 'path', type: 'string', description: 'File path relative to workspace', required: true }]
        );
        this.workspace = workspace;
    }

    async execute(input: string): Promise<ToolResult> {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                const filePath = input.replace(/^['"]|['"]$/g, '').trim();
                const fullPath = path.join(this.workspace, filePath);

                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot read file outside workspace`, Date.now() - startTime));
                }

                const content = await fs.readFile(fullPath, 'utf8');
                return resolve(this.success(content, { path: filePath }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error reading file: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}

export class EditFileTool extends BaseTool {
    private workspace: string;
    private agentName: string;
    private onProgress?: (event: DevTeamEvent) => void;

    constructor(workspace: string, agentName: string, onProgress?: (event: DevTeamEvent) => void) {
        super(
            'edit_file',
            'Edits an existing file, replacing its entire content. Input format should be a JSON string with "path" and "content" properties. Example: {"path": "index.js", "content": "console.log(\'updated\');"}',
            [
                { name: 'path', type: 'string', description: 'File path relative to workspace', required: true },
                { name: 'content', type: 'string', description: 'New file content', required: true }
            ]
        );
        this.workspace = workspace;
        this.agentName = agentName;
        this.onProgress = onProgress;
    }

    async execute(input: string): Promise<ToolResult> {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                let parsed: { path: string, content: string };
                try {
                    parsed = JSON.parse(input);
                } catch (e) {
                    return resolve(this.failure(`Invalid JSON input format`, Date.now() - startTime));
                }

                if (!parsed.path || typeof parsed.content !== 'string') {
                    return resolve(this.failure(`Input must contain "path" and "content"`, Date.now() - startTime));
                }

                const fullPath = path.join(this.workspace, parsed.path);

                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot write file outside workspace`, Date.now() - startTime));
                }

                // Allow creation if missing but intent was to edit
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, parsed.content, 'utf8');

                this.onProgress?.({
                    type: 'file_created', // Use file_created event type so Dashboard displays it
                    agent: this.agentName,
                    data: { filename: parsed.path, path: fullPath, action: 'edited' },
                    timestamp: Date.now()
                });

                return resolve(this.success(`File successfully edited at ${parsed.path}`, { path: parsed.path }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error editing file: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}
