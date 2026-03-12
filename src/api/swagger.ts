/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

export const swaggerDocument = {
    openapi: "3.0.0",
    info: {
        title: "Monult API",
        version: "1.0.0",
        description: "Multi-Model AI Operating System for Developers orchestrate, debate, and verify across AI models."
    },
    servers: [
        {
            url: "http://localhost:3000",
            description: "Local Development Server"
        }
    ],
    paths: {
        "/api/health": {
            get: {
                summary: "Health check",
                description: "Returns the health status, version, uptime, active providers, and available agents.",
                responses: {
                    "200": {
                        description: "Successful response"
                    }
                }
            }
        },
        "/api/generate": {
            post: {
                summary: "Generate AI response",
                description: "Generate a response from a specific AI model or provider.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["prompt"],
                                properties: {
                                    prompt: { type: "string" },
                                    model: { type: "string" },
                                    provider: { type: "string" },
                                    systemPrompt: { type: "string" },
                                    maxTokens: { type: "integer" },
                                    temperature: { type: "number" }
                                }
                            }
                        }
                    }
                },
                responses: { "200": { description: "Successful generation" } }
            }
        },
        "/api/assembly": {
            post: {
                summary: "Run multi-model assembly",
                description: "Orchestrate multiple models to answer a prompt, debate, and reach consensus.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["prompt"],
                                properties: {
                                    prompt: { type: "string" },
                                    models: { type: "array", items: { type: "string" } },
                                    debate: { type: "boolean" },
                                    verify: { type: "boolean" },
                                    rounds: { type: "integer" }
                                }
                            }
                        }
                    }
                },
                responses: { "200": { description: "Assembly complete" } }
            }
        },
        "/api/debate": {
            post: {
                summary: "Run AI debate",
                description: "Force multiple models into an adversarial debate over a topic.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["topic"],
                                properties: {
                                    topic: { type: "string" },
                                    models: { type: "array", items: { type: "string" } },
                                    rounds: { type: "integer" }
                                }
                            }
                        }
                    }
                },
                responses: { "200": { description: "Debate complete" } }
            }
        },
        "/api/route": {
            post: {
                summary: "Route to best model",
                description: "Automatically select the best provider/model for a prompt based on cost, speed, or quality.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["prompt"],
                                properties: {
                                    prompt: { type: "string" },
                                    strategy: { type: "string", enum: ["cost", "balanced", "quality", "speed"] },
                                    maxCost: { type: "number" }
                                }
                            }
                        }
                    }
                },
                responses: { "200": { description: "Routed successfully" } }
            }
        },
        "/api/agents": {
            get: {
                summary: "List available agents",
                responses: { "200": { description: "List of agents" } }
            }
        },
        "/api/agents/{name}/run": {
            post: {
                summary: "Run an agent",
                description: "Execute a specific autonomous agent with a task.",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["instruction"],
                                properties: {
                                    instruction: { type: "string" }
                                }
                            }
                        }
                    }
                },
                responses: { "200": { description: "Agent execution complete" } }
            }
        },
        "/api/memory/recall": {
            post: {
                summary: "Recall memories",
                description: "Perform a vector search to recall contextual memories.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["query"],
                                properties: {
                                    query: { type: "string" },
                                    namespace: { type: "string" },
                                    limit: { type: "integer" }
                                }
                            }
                        }
                    }
                },
                responses: { "200": { description: "Memories retrieved" } }
            }
        },
        "/api/cost": {
            get: {
                summary: "Get cost analytics",
                description: "Retrieve accumulated and broken-down API usage costs.",
                responses: { "200": { description: "Cost data" } }
            }
        }
    }
};
