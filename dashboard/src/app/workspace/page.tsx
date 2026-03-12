/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { FolderTree, File, Folder, Trash2, Eye, Download } from "lucide-react";

export default function WorkspacePage() {
    const { data, loading, error, events, isConnected } = useDashboardData();
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
    const [workspaces, setWorkspaces] = useState<string[]>([]);

    useEffect(() => {
        // Load existing workspaces
        const loadWorkspaces = async () => {
            try {
                const response = await fetch("/api/workspace/list");
                if (response.ok) {
                    const result = await response.json();
                    setWorkspaces(result.workspaces || []);
                }
            } catch (err) {
                console.error("Failed to load workspaces:", err);
            }
        };
        loadWorkspaces();
    }, []);

    const handleCreateWorkspace = async () => {
        if (!selectedWorkspace.trim()) {
            console.error("Please enter a workspace name");
            return;
        }

        try {
            const response = await fetch("/api/workspace/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: selectedWorkspace })
            });

            if (response.ok) {
                console.log(`Workspace "${selectedWorkspace}" created successfully`);
                // Refresh workspaces list
                const result = await response.json();
                setWorkspaces(result.workspaces || []);
                setSelectedWorkspace("");
            } else {
                const error = await response.json();
                console.error(error.error || "Failed to create workspace");
            }
        } catch (err) {
            console.error("Failed to create workspace");
        }
    };

    const handleDeleteWorkspace = async (workspaceName: string) => {
        try {
            const response = await fetch(`/api/workspace/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: workspaceName })
            });

            if (response.ok) {
                console.log(`Workspace "${workspaceName}" deleted successfully`);
                // Refresh workspaces list
                const result = await response.json();
                setWorkspaces(result.workspaces || []);
            } else {
                const error = await response.json();
                console.error(error.error || "Failed to delete workspace");
            }
        } catch (err) {
            console.error("Failed to delete workspace");
        }
    };

    const handleOpenWorkspace = (workspaceName: string) => {
        window.open(`/workspace/${workspaceName}`, "_blank");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Workspace Manager</h1>
                    <p className="text-muted-foreground">
                        Manage your development workspaces and projects
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                        {isConnected ? "Connected" : "Disconnected"}
                    </span>
                </div>
            </div>

            {/* Create Workspace */}
            <Card>
                <CardHeader>
                    <CardTitle>Create New Workspace</CardTitle>
                    <CardDescription>
                        Create a new workspace for your development projects
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="workspace-name">Workspace Name</Label>
                            <Input
                                id="workspace-name"
                                placeholder="my-project"
                                value={selectedWorkspace}
                                onChange={(e) => setSelectedWorkspace(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleCreateWorkspace} className="w-full">
                                <FolderTree className="mr-2 h-4 w-4" />
                                Create Workspace
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Workspaces List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Workspaces</CardTitle>
                    <CardDescription>
                        Manage and access your existing workspaces
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-center py-8">
                            Error loading workspaces: {error}
                        </div>
                    ) : workspaces.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No workspaces found. Create your first workspace above.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workspaces.map((workspace) => (
                                <Card key={workspace} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Folder className="h-6 w-6 text-blue-600" />
                                                <div>
                                                    <CardTitle className="text-lg">{workspace}</CardTitle>
                                                    <CardDescription>Development workspace</CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenWorkspace(workspace)}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Open
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteWorkspace(workspace)}
                                                    className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <span>Workspace directory</span>
                                            <span className="font-mono">{workspace}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Activity */}
            {events.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest events from your workspaces
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {events.slice(-10).map((event, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            event.type === 'file_created' ? 'bg-green-100 text-green-800' :
                                            event.type === 'command_executed' ? 'bg-blue-100 text-blue-800' :
                                            event.type === 'error' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {event.type}
                                        </span>
                                        <span className="text-sm">{event.agent || 'System'}</span>
                                        {event.task && <span className="text-xs text-muted-foreground">• {event.task}</span>}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}