/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2024 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Command Execution Tool
// ─────────────────────────────────────────────────────────────
// Securely executes shell commands within agent workspaces.
// ─────────────────────────────────────────────────────────────

import { BaseTool } from './base';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execPromise = promisify(exec);

interface CommandInput {
  command: string;
  args?: string[];
  timeout?: number; // milliseconds
}

export class RunCommandTool extends BaseTool {
  workspace: string;
  agentName: string;
  onProgress?: (event: any) => void;

  constructor(workspace: string, agentName: string, onProgress?: (event: any) => void) {
    super('run_command', 'Execute shell commands in the agent workspace');
    this.workspace = workspace;
    this.agentName = agentName;
    this.onProgress = onProgress;
  }

  validateInput(input: any): boolean {
    return typeof input === 'string' || (input.command && typeof input.command === 'string');
  }

  async execute(input: string): Promise<any> {
    try {
      const parsedInput: CommandInput = typeof input === 'string' ? JSON.parse(input) : input;
      const { command, args = [], timeout = 30000 } = parsedInput;

      // Security: Define restricted paths and commands
      const restrictedPaths = ['/etc/', '/usr/', '/bin/', '/sbin/', '/root/', '/home/', '/Users/root/'];
      const restrictedCommands = ['rm', 'sudo', 'chown', 'chmod', 'dd', 'mkfs', 'fdisk', 'mount', 'umount'];
      
      // Check if command is in restricted list
      if (restrictedCommands.includes(command)) {
        return {
          success: false,
          error: `Access denied: Command '${command}' is restricted`,
          output: '',
          latency: 0
        };
      }

      // Check if any argument points to a restricted path
      const allArgs = [command, ...args];
      for (const arg of allArgs) {
        for (const restrictedPath of restrictedPaths) {
          if (arg.includes(restrictedPath)) {
            return {
              success: false,
              error: `Access denied: Cannot access restricted path '${restrictedPath}'`,
              output: '',
              latency: 0
            };
          }
        }
      }

      // Security: Only allow commands within the agent's workspace
      const fullPath = path.resolve(this.workspace);
      const commandPath = path.resolve(process.cwd());
      
      if (!fullPath.startsWith(commandPath)) {
        return {
          success: false,
          error: 'Access denied: Cannot execute command outside workspace',
          output: '',
          latency: 0
        };
      }

      // Build command string
      const commandString = [command, ...args].join(' ');
      
      this.onProgress?.({
        type: 'command_executed',
        agent: this.agentName,
        data: { command: commandString },
        timestamp: Date.now()
      });

      // Execute command with timeout
      const startTime = Date.now();
      const { stdout, stderr } = await execPromise(commandString, {
        cwd: this.workspace,
        timeout,
        maxBuffer: 1024 * 1024 // 1MB buffer limit
      });
      
      const latency = Date.now() - startTime;
      const output = stdout.trim() || stderr.trim();

      return {
        success: true,
        output,
        data: {
          command: commandString,
          exitCode: 0
        },
        latency
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Command execution failed',
        output: error.stdout || error.stderr || '',
        latency: 0
      };
    }
  }
}