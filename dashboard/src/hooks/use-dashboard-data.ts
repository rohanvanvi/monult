/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

interface DashboardData {
    health: any;
    cost: any;
    agents: any[];
    models: any[];
    providers: string[];
}

interface DevTeamEvent {
    type: 'leader_start' | 'leader_progress' | 'leader_complete' | 'agent_start' | 'agent_progress' | 'agent_complete' | 'file_created' | 'command_executed' | 'consensus_reached' | 'error';
    agent?: string;
    task?: string;
    progress?: string;
    data?: any;
    timestamp: number;
}

export function useDashboardData() {
    const [data, setData] = useState<DashboardData>({
        health: null,
        cost: null,
        agents: [],
        models: [],
        providers: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [events, setEvents] = useState<DevTeamEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [health, cost, agentsRes, modelsRes, providersRes] = await Promise.allSettled([
                api.getHealth(),
                api.getCost(),
                api.getAgents(),
                api.getModels(),
                api.getProviders(),
            ]);

            setData({
                health: health.status === "fulfilled" ? health.value : null,
                cost: cost.status === "fulfilled" ? cost.value : null,
                agents: agentsRes.status === "fulfilled" ? (agentsRes.value.agents || []) : [],
                models: modelsRes.status === "fulfilled" ? (modelsRes.value.models || []) : [],
                providers: providersRes.status === "fulfilled" ? (providersRes.value.providers || []) : [],
            });
            setError(null);
        } catch (err: any) {
            setError(err.message || "Connection failed");
        } finally {
            setLoading(false);
        }
    }, []);

    // Setup connection status check
    const setupEventSource = useCallback(async () => {
        try {
            // Test connection to the API server
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/api/health`);
            if (response.ok) {
                setIsConnected(true);
                console.log('API connection established');
            } else {
                setIsConnected(false);
            }
        } catch (err) {
            console.error('Failed to connect to API:', err);
            setIsConnected(false);
        }
    }, []);

    // Cleanup SSE connection
    const cleanupEventSource = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
    }, []);

    useEffect(() => {
        fetchAll();
        
        // Setup SSE connection
        setupEventSource();

        // Polling fallback every 30 seconds
        const interval = setInterval(fetchAll, 30000);
        
        return () => {
            clearInterval(interval);
            cleanupEventSource();
        };
    }, [fetchAll, setupEventSource, cleanupEventSource]);

    // Clear events
    const clearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    // Add event
    const addEvent = useCallback((event: DevTeamEvent) => {
        setEvents(prev => [...prev, event]);
    }, []);

    return { 
        data, 
        loading, 
        error, 
        events,
        isConnected,
        refetch: fetchAll,
        clearEvents,
        addEvent,
        setupEventSource,
        cleanupEventSource
    };
}
