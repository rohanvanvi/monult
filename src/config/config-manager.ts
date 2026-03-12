/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface GlobalConfig {
    providers: {
        [key: string]: {
            apiKey?: string;
            baseUrl?: string;
            [key: string]: any;
        };
    };
    defaultProvider?: string;
    [key: string]: any;
}

export interface LocalConfig {
    projectName?: string;
    language?: string;
    framework?: string;
    agents?: string[];
    [key: string]: any;
}

/**
 * Manages Monult configuration across global (~/.monult) and local (.monult.json) scopes.
 */
export class ConfigManager {
    private globalConfigPath: string;
    private localConfigPath: string;

    constructor() {
        this.globalConfigPath = path.join(os.homedir(), '.monult', 'config.json');
        this.localConfigPath = path.join(process.cwd(), '.monult.json');
    }

    // ── Global Config (~/.monult/config.json) ────────────────

    async getGlobalConfig(): Promise<GlobalConfig> {
        return this.readJsonFile<GlobalConfig>(this.globalConfigPath, { providers: {} });
    }

    async saveGlobalConfig(config: GlobalConfig): Promise<void> {
        await this.ensureDirectoryExists(path.dirname(this.globalConfigPath));
        await fs.writeFile(this.globalConfigPath, JSON.stringify(config, null, 2), { mode: 0o600 }); // Restrict permissions
    }

    async getProviderConfig(providerName: string): Promise<GlobalConfig['providers'][string] | undefined> {
        const config = await this.getGlobalConfig();
        return config.providers[providerName];
    }

    async setProviderConfig(providerName: string, configUpdates: any): Promise<void> {
        const config = await this.getGlobalConfig();
        if (!config.providers) config.providers = {};

        config.providers[providerName] = {
            ...config.providers[providerName],
            ...configUpdates
        };
        await this.saveGlobalConfig(config);
    }

    async removeProviderConfig(providerName: string): Promise<boolean> {
        const config = await this.getGlobalConfig();
        if (config.providers && config.providers[providerName]) {
            delete config.providers[providerName];
            await this.saveGlobalConfig(config);
            return true;
        }
        return false;
    }

    // ── Local Config (.monult.json) ──────────────────────────

    async getLocalConfig(): Promise<LocalConfig | null> {
        try {
            await fs.access(this.localConfigPath);
            return this.readJsonFile<LocalConfig>(this.localConfigPath, {});
        } catch {
            return null; // Local config doesn't exist
        }
    }

    async saveLocalConfig(config: LocalConfig): Promise<void> {
        await fs.writeFile(this.localConfigPath, JSON.stringify(config, null, 2));
    }

    // ── Helpers ──────────────────────────────────────────────

    private async readJsonFile<T>(filePath: string, defaultVal: T): Promise<T> {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data) as T;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return defaultVal;
            }
            throw new Error(`Failed to parse ${filePath}: ${error.message}`);
        }
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
}

// Export a singleton instance for easy usage
export const configManager = new ConfigManager();
