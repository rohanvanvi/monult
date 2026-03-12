/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Monult — CLI Workspace Command
// ─────────────────────────────────────────────────────────────
// CLI command for managing workspaces.
// ─────────────────────────────────────────────────────────────

import { Command } from 'commander';
import { WorkspaceManager } from '../../core/workspace-manager';
import * as path from 'path';

export function createWorkspaceCommand(program: Command): void {
  const workspaceCmd = program
    .command('workspace')
    .description('Manage workspaces');

  // Create workspace command
  workspaceCmd
    .command('create')
    .description('Create a new workspace')
    .argument('<name>', 'Name of the workspace')
    .option('-m, --metadata <json>', 'Workspace metadata as JSON')
    .action((name, options) => {
      try {
        const workspaceManager = new WorkspaceManager();
        const metadata = options.metadata ? JSON.parse(options.metadata) : undefined;
        const workspace = workspaceManager.createWorkspace(name, metadata);
        
        console.log(`Workspace created successfully:`);
        console.log(`  ID: ${workspace.id}`);
        console.log(`  Name: ${workspace.name}`);
        console.log(`  Path: ${workspace.path}`);
        console.log(`  Created: ${new Date(workspace.createdAt).toLocaleString()}`);
      } catch (error) {
        console.error('Error creating workspace:', error);
        process.exit(1);
      }
    });

  // List workspaces command
  workspaceCmd
    .command('list')
    .description('List all workspaces')
    .action(() => {
      try {
        const workspaceManager = new WorkspaceManager();
        const workspaces = workspaceManager.listWorkspaces();
        
        if (workspaces.length === 0) {
          console.log('No workspaces found.');
          return;
        }
        
        console.log('Workspaces:');
        workspaces.forEach(ws => {
          console.log(`  ${ws.id}: ${ws.name}`);
          console.log(`    Path: ${ws.path}`);
          console.log(`    Created: ${new Date(ws.createdAt).toLocaleString()}`);
          console.log(`    Last Accessed: ${new Date(ws.lastAccessed).toLocaleString()}`);
          if (ws.metadata) {
            console.log(`    Metadata: ${JSON.stringify(ws.metadata)}`);
          }
          console.log('');
        });
      } catch (error) {
        console.error('Error listing workspaces:', error);
        process.exit(1);
      }
    });

  // Get workspace command
  workspaceCmd
    .command('get')
    .description('Get details of a specific workspace')
    .argument('<id>', 'ID of the workspace')
    .action((id) => {
      try {
        const workspaceManager = new WorkspaceManager();
        const workspace = workspaceManager.getWorkspace(id);
        
        if (!workspace) {
          console.error(`Workspace with ID ${id} not found.`);
          process.exit(1);
        }
        
        console.log('Workspace details:');
        console.log(`  ID: ${workspace.id}`);
        console.log(`  Name: ${workspace.name}`);
        console.log(`  Path: ${workspace.path}`);
        console.log(`  Created: ${new Date(workspace.createdAt).toLocaleString()}`);
        console.log(`  Last Accessed: ${new Date(workspace.lastAccessed).toLocaleString()}`);
        if (workspace.metadata) {
          console.log(`  Metadata: ${JSON.stringify(workspace.metadata, null, 2)}`);
        }
      } catch (error) {
        console.error('Error getting workspace:', error);
        process.exit(1);
      }
    });

  // Delete workspace command
  workspaceCmd
    .command('delete')
    .description('Delete a workspace')
    .argument('<id>', 'ID of the workspace to delete')
    .option('-f, --force', 'Force deletion without confirmation')
    .action(async (id, options) => {
      try {
        const workspaceManager = new WorkspaceManager();
        const workspace = workspaceManager.getWorkspace(id);
        
        if (!workspace) {
          console.error(`Workspace with ID ${id} not found.`);
          process.exit(1);
        }
        
        // Confirm deletion unless force flag is used
        if (!options.force) {
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const answer = await new Promise<string>((resolve) => {
            readline.question(`Are you sure you want to delete workspace "${workspace.name}" (ID: ${id})? This action cannot be undone. (yes/no): `, resolve);
          });
          
          readline.close();
          
          if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
            console.log('Deletion cancelled.');
            return;
          }
        }
        
        const success = workspaceManager.deleteWorkspace(id);
        if (success) {
          console.log(`Workspace "${workspace.name}" (ID: ${id}) deleted successfully.`);
        } else {
          console.error('Failed to delete workspace.');
          process.exit(1);
        }
      } catch (error) {
        console.error('Error deleting workspace:', error);
        process.exit(1);
      }
    });

  // Update workspace metadata command
  workspaceCmd
    .command('update')
    .description('Update workspace metadata')
    .argument('<id>', 'ID of the workspace')
    .argument('<metadata>', 'New metadata as JSON')
    .action((id, metadataJson) => {
      try {
        const workspaceManager = new WorkspaceManager();
        const metadata = JSON.parse(metadataJson);
        const success = workspaceManager.updateWorkspaceMetadata(id, metadata);
        
        if (success) {
          console.log(`Workspace metadata updated successfully.`);
        } else {
          console.error(`Failed to update workspace metadata. Workspace with ID ${id} not found.`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Error updating workspace metadata:', error);
        process.exit(1);
      }
    });
}