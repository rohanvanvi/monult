/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — Workspace Manager
// ─────────────────────────────────────────────────────────────
// Manages multiple workspaces for isolated project development.
// ─────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';

export interface WorkspaceConfig {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

export class WorkspaceManager {
  private workspacesDir: string;
  private configPath: string;
  private workspaces: Map<string, WorkspaceConfig>;

  constructor(workspacesDir: string = './workspaces') {
    this.workspacesDir = workspacesDir;
    this.configPath = path.join(this.workspacesDir, 'config.json');
    this.workspaces = new Map();
    
    // Create workspaces directory if it doesn't exist
    if (!fs.existsSync(this.workspacesDir)) {
      fs.mkdirSync(this.workspacesDir, { recursive: true });
    }
    
    // Load existing workspaces
    this.loadWorkspaces();
  }

  /**
   * Creates a new workspace
   */
  createWorkspace(name: string, metadata?: Record<string, any>): WorkspaceConfig {
    const id = this.generateWorkspaceId();
    const workspacePath = path.join(this.workspacesDir, id);
    
    // Create workspace directory
    fs.mkdirSync(workspacePath, { recursive: true });
    
    // Create workspace config
    const workspace: WorkspaceConfig = {
      id,
      name,
      path: workspacePath,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      metadata
    };
    
    // Add to workspaces map
    this.workspaces.set(id, workspace);
    
    // Save workspaces
    this.saveWorkspaces();
    
    return workspace;
  }

  /**
   * Gets a workspace by ID
   */
  getWorkspace(id: string): WorkspaceConfig | null {
    const workspace = this.workspaces.get(id);
    if (workspace) {
      // Update last accessed time
      workspace.lastAccessed = Date.now();
      this.workspaces.set(id, workspace);
      this.saveWorkspaces();
    }
    return workspace || null;
  }

  /**
   * Lists all workspaces
   */
  listWorkspaces(): WorkspaceConfig[] {
    return Array.from(this.workspaces.values());
  }

  /**
   * Deletes a workspace
   */
  deleteWorkspace(id: string): boolean {
    const workspace = this.workspaces.get(id);
    if (!workspace) {
      return false;
    }
    
    // Remove from map
    this.workspaces.delete(id);
    
    // Delete workspace directory
    if (fs.existsSync(workspace.path)) {
      fs.rmSync(workspace.path, { recursive: true });
    }
    
    // Save workspaces
    this.saveWorkspaces();
    
    return true;
  }

  /**
   * Updates workspace metadata
   */
  updateWorkspaceMetadata(id: string, metadata: Record<string, any>): boolean {
    const workspace = this.workspaces.get(id);
    if (!workspace) {
      return false;
    }
    
    workspace.metadata = { ...workspace.metadata, ...metadata };
    workspace.lastAccessed = Date.now();
    this.workspaces.set(id, workspace);
    this.saveWorkspaces();
    
    return true;
  }

  /**
   * Generates a unique workspace ID
   */
  private generateWorkspaceId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Loads workspaces from config file
   */
  private loadWorkspaces(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const workspacesArray: WorkspaceConfig[] = JSON.parse(configData);
        workspacesArray.forEach(ws => {
          this.workspaces.set(ws.id, ws);
        });
      } catch (error) {
        console.error('Error loading workspaces:', error);
      }
    }
  }

  /**
   * Saves workspaces to config file
   */
  private saveWorkspaces(): void {
    try {
      const workspacesArray = Array.from(this.workspaces.values());
      fs.writeFileSync(this.configPath, JSON.stringify(workspacesArray, null, 2));
    } catch (error) {
      console.error('Error saving workspaces:', error);
    }
  }
}