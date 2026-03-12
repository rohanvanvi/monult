/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Filesystem Tools
// ─────────────────────────────────────────────────────────────
// Real filesystem operations for agents to create, read, and
// manage files during development tasks.
// ─────────────────────────────────────────────────────────────

import { BaseTool, ToolResult } from './base';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DevTeamEvent } from '../core/devteam';

export class CreateDirectoryTool extends BaseTool {
    private workspace: string;
    private agentName: string;
    private onProgress?: (event: DevTeamEvent) => void;

    constructor(workspace: string, agentName: string, onProgress?: (event: DevTeamEvent) => void) {
        super(
            'create_directory',
            'Creates a new directory in the workspace. Example input: src/components',
            [{ name: 'directoryPath', type: 'string', description: 'Path to directory (relative to workspace)', required: true }]
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
                const directoryPath = input.replace(/^['"]|['"]$/g, '').trim();
                const fullPath = path.join(this.workspace, directoryPath);

                // Basic security path traversal check
                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot create directory outside workspace`, Date.now() - startTime));
                }

                await fs.mkdir(fullPath, { recursive: true });
                
                this.onProgress?.({
                    type: 'file_created',
                    agent: this.agentName,
                    data: { filename: directoryPath, path: fullPath },
                    timestamp: Date.now()
                });

                return resolve(this.success(`Directory created at ${directoryPath}`, { path: directoryPath }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error creating directory: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}

export class WriteFileTool extends BaseTool {
    private workspace: string;
    private agentName: string;
    private onProgress?: (event: DevTeamEvent) => void;

    constructor(workspace: string, agentName: string, onProgress?: (event: DevTeamEvent) => void) {
        super(
            'write_file',
            'Writes content to a file (creates new or overwrites existing). Input format should be a JSON string with "path" and "content" properties. Example: {"path": "index.js", "content": "console.log(\'hello\');"}',
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
                    return resolve(this.failure(`Invalid JSON input format`, Date.now() - startTime));
                }

                if (!parsed.path || typeof parsed.content !== 'string') {
                    return resolve(this.failure(`Input must contain "path" and "content"`, Date.now() - startTime));
                }

                const fullPath = path.join(this.workspace, parsed.path);

                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot write file outside workspace`, Date.now() - startTime));
                }

                // Ensure parent directory exists
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                
                // Write file atomically by writing to temp file first
                const tempPath = `${fullPath}.${Date.now()}.tmp`;
                await fs.writeFile(tempPath, parsed.content, 'utf8');
                await fs.rename(tempPath, fullPath);

                this.onProgress?.({
                    type: 'file_created',
                    agent: this.agentName,
                    data: { filename: parsed.path, path: fullPath },
                    timestamp: Date.now()
                });

                return resolve(this.success(`File successfully written at ${parsed.path}`, { path: parsed.path }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error writing file: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}

export class AppendFileTool extends BaseTool {
    private workspace: string;
    private agentName: string;
    private onProgress?: (event: DevTeamEvent) => void;

    constructor(workspace: string, agentName: string, onProgress?: (event: DevTeamEvent) => void) {
        super(
            'append_file',
            'Appends content to an existing file. Input format should be a JSON string with "path" and "content" properties. Example: {"path": "log.txt", "content": "\\nNew log entry"}',
            [
                { name: 'path', type: 'string', description: 'File path relative to workspace', required: true },
                { name: 'content', type: 'string', description: 'Content to append', required: true }
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
                    return resolve(this.failure(`Access denied: Cannot append to file outside workspace`, Date.now() - startTime));
                }

                await fs.appendFile(fullPath, parsed.content, 'utf8');

                this.onProgress?.({
                    type: 'file_created',
                    agent: this.agentName,
                    data: { filename: parsed.path, path: fullPath, action: 'appended' },
                    timestamp: Date.now()
                });

                return resolve(this.success(`Content successfully appended to ${parsed.path}`, { path: parsed.path }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error appending to file: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}

export class ReadFileTool extends BaseTool {
    private workspace: string;

    constructor(workspace: string) {
        super(
            'read_file_advanced',
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

export class ListFilesTool extends BaseTool {
    private workspace: string;

    constructor(workspace: string) {
        super(
            'list_files',
            'Lists files in a directory. Example input: src/',
            [{ name: 'path', type: 'string', description: 'Directory path relative to workspace', required: true }]
        );
        this.workspace = workspace;
    }

    async execute(input: string): Promise<ToolResult> {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                const dirPath = input.replace(/^['"]|['"]$/g, '').trim();
                const fullPath = path.join(this.workspace, dirPath);

                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot list directory outside workspace`, Date.now() - startTime));
                }

                const entries = await fs.readdir(fullPath, { withFileTypes: true });
                const fileList = entries.map(entry => 
                    entry.isDirectory() ? `${entry.name}/` : entry.name
                );

                return resolve(this.success(fileList.join('\n'), { files: fileList, path: dirPath }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error listing directory: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}

export class DeleteFileTool extends BaseTool {
    private workspace: string;
    private agentName: string;
    private onProgress?: (event: DevTeamEvent) => void;

    constructor(workspace: string, agentName: string, onProgress?: (event: DevTeamEvent) => void) {
        super(
            'delete_file',
            'Deletes a file from the workspace. Example input: src/temp.txt',
            [{ name: 'path', type: 'string', description: 'File path relative to workspace', required: true }]
        );
        this.workspace = workspace;
        this.agentName = agentName;
        this.onProgress = onProgress;
    }

    async execute(input: string): Promise<ToolResult> {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                const filePath = input.replace(/^['"]|['"]$/g, '').trim();
                const fullPath = path.join(this.workspace, filePath);

                if (!fullPath.startsWith(this.workspace)) {
                    return resolve(this.failure(`Access denied: Cannot delete file outside workspace`, Date.now() - startTime));
                }

                await fs.unlink(fullPath);

                this.onProgress?.({
                    type: 'file_created',
                    agent: this.agentName,
                    data: { filename: filePath, path: fullPath, action: 'deleted' },
                    timestamp: Date.now()
                });

                return resolve(this.success(`File successfully deleted: ${filePath}`, { path: filePath }, Date.now() - startTime));
            } catch (err: any) {
                return resolve(this.failure(`Error deleting file: ${err.message}`, Date.now() - startTime));
            }
        });
    }
}
