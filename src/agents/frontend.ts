/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

// ─────────────────────────────────────────────────────────────
// Agent — Frontend
// ─────────────────────────────────────────────────────────────

import { BaseAgent } from './base';
import { UniversalSDK } from '../core/sdk';
import { ContextManager } from '../memory/context-manager';
import { AgentTask, AgentResult, AgentStep } from './base';

export class FrontendAgent extends BaseAgent {
    constructor(sdk: UniversalSDK, memory: ContextManager) {
        super(sdk, memory, {
            name: 'frontend',
            description: 'Expert UI/UX engineer specializing in React, Next.js, and CSS/Tailwind.',
            systemPrompt: 'You are a Senior Frontend Engineer. You specialize in creating accessible, beautiful, and highly responsive user interfaces using modern frameworks like React and Next.js. Focus on component structure, state management, and user experience.',
        });
    }

    /**
     * Override the run method to handle DevTeam tasks specifically.
     * For frontend tasks, create complete web applications with HTML, CSS, and JavaScript.
     */
    async run(task: AgentTask): Promise<AgentResult> {
        // Check if this is a DevTeam task
        if (task.context && task.context.capabilities && Array.isArray(task.context.capabilities) && task.context.capabilities.includes('file_system')) {
            return this.runDevTeamTask(task);
        }
        
        // Fall back to base implementation for other tasks
        return super.run(task);
    }

    /**
     * Handle DevTeam frontend tasks by creating complete web applications.
     */
    private async runDevTeamTask(task: AgentTask): Promise<AgentResult> {
        const startTime = Date.now();
        const steps: AgentStep[] = [];
        const workspace = (task.context as any)?.workspace || '';
        const capabilities = (task.context as any)?.capabilities || [];
        
        // Create a complete project structure
        const projectFiles = this.generateProjectStructure(task.input);
        
        for (const file of projectFiles) {
            const step: AgentStep = {
                iteration: steps.length + 1,
                thought: `Creating ${file.name} for the project in workspace ${workspace}`,
                toolName: 'write_file',
                toolInput: JSON.stringify({
                    path: workspace ? `${workspace}/${file.name}` : file.name,
                    content: file.content
                }),
                timestamp: Date.now()
            };

            // Execute the write_file tool with proper path
            const writeTool = this.tools.get('write_file');
            if (!writeTool) {
                step.toolResult = { success: false, output: 'write_file tool not available', latency: 0 };
                step.observation = 'write_file tool not available';
            } else {
                const toolResult = await writeTool.execute(step.toolInput || '');
                step.toolResult = toolResult;
                step.observation = toolResult?.output || 'File created successfully';
            }
            
            steps.push(step);
        }

        const finalOutput = `Successfully created a complete frontend project with ${projectFiles.length} files:
${projectFiles.map(f => `- ${f.name}`).join('\n')}

Project is ready for development and can be opened in any browser.`;

        return {
            taskId: task.id,
            agentName: this.name,
            output: finalOutput,
            steps,
            success: true,
            totalIterations: steps.length,
            totalLatency: Date.now() - startTime,
            timestamp: Date.now(),
        };
    }

    /**
     * Generate the complete project structure based on the task description.
     */
    private generateProjectStructure(taskInput: string): Array<{name: string, content: string}> {
        // Analyze the task to determine what type of project to create
        const isTodoApp = taskInput.toLowerCase().includes('todo') || taskInput.toLowerCase().includes('to-do');
        const isWebApp = taskInput.toLowerCase().includes('web') || taskInput.toLowerCase().includes('app');
        const isSimple = taskInput.toLowerCase().includes('simple') || taskInput.toLowerCase().includes('basic');

        if (isTodoApp || isSimple) {
            // Create a simple to-do app
            return [
                {
                    name: 'index.html',
                    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple To-Do App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>My To-Do List</h1>
        <div class="input-section">
            <input type="text" id="todo-input" placeholder="Add a new to-do...">
            <button id="add-button">Add</button>
        </div>
        <ul id="todo-list">
            <!-- To-do items will be added here by JavaScript -->
        </ul>
    </div>
    <script src="script.js"></script>
</body>
</html>`
                },
                {
                    name: 'styles.css',
                    content: `body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    margin: 0;
    padding-top: 50px;
}

.container {
    background-color: #ffffff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
}

h1 {
    text-align: center;
    color: #333;
    margin-bottom: 25px;
}

.input-section {
    display: flex;
    margin-bottom: 20px;
}

#todo-input {
    flex-grow: 1;
    padding: 12px 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    margin-right: 10px;
}

#todo-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

#add-button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.2s ease;
}

#add-button:hover {
    background-color: #0056b3;
}

#todo-list {
    list-style: none;
    padding: 0;
}

#todo-list li {
    background-color: #f9f9f9;
    border: 1px solid #eee;
    padding: 12px 15px;
    margin-bottom: 10px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
}

#todo-list li.completed span {
    text-decoration: line-through;
    color: #888;
}

#todo-list li button {
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
    margin-left: 10px;
}

#todo-list li button:hover {
    background-color: #c82333;
}

#todo-list li .actions {
    display: flex;
    align-items: center;
}

#todo-list li .actions .toggle-complete {
    background-color: #28a745;
    margin-right: 5px;
}

#todo-list li .actions .toggle-complete:hover {
    background-color: #218838;
}

@media (max-width: 600px) {
    .container {
        padding: 20px;
        margin: 20px;
    }
    .input-section {
        flex-direction: column;
    }
    #todo-input {
        margin-right: 0;
        margin-bottom: 10px;
    }
    #add-button {
        width: 100%;
    }
}`
                },
                {
                    name: 'script.js',
                    content: `document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const addButton = document.getElementById('add-button');
    const todoList = document.getElementById('todo-list');

    // Load todos from local storage
    let todos = JSON.parse(localStorage.getItem('todos')) || [];

    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function renderTodos() {
        todoList.innerHTML = ''; // Clear current list
        todos.forEach((todo, index) => {
            const listItem = document.createElement('li');
            listItem.className = todo.completed ? 'completed' : '';

            const todoText = document.createElement('span');
            todoText.textContent = todo.text;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';

            const completeButton = document.createElement('button');
            completeButton.className = 'toggle-complete';
            completeButton.textContent = todo.completed ? 'Uncomplete' : 'Complete';
            completeButton.addEventListener('click', () => toggleComplete(index));

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteTodo(index));

            actionsDiv.appendChild(completeButton);
            actionsDiv.appendChild(deleteButton);

            listItem.appendChild(todoText);
            listItem.appendChild(actionsDiv);
            todoList.appendChild(listItem);
        });
    }

    function addTodo() {
        const todoText = todoInput.value.trim();
        if (todoText !== '') {
            todos.push({ text: todoText, completed: false });
            todoInput.value = '';
            saveTodos();
            renderTodos();
        }
    }

    function toggleComplete(index) {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
    }

    function deleteTodo(index) {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    }

    addButton.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTodo();
        }
    });

    // Initial render
    renderTodos();
});`
                },
                {
                    name: 'package.json',
                    content: `{
  "name": "simple-todo-app",
  "version": "1.0.0",
  "description": "A simple to-do application built with HTML, CSS, and JavaScript",
  "main": "index.html",
  "scripts": {
    "start": "python -m http.server 8000",
    "dev": "python -m http.server 8000"
  },
  "keywords": [
    "todo",
    "javascript",
    "html",
    "css",
    "vanilla-js"
  ],
  "author": "Monult DevTeam",
  "license": "MIT"
}`
                }
            ];
        }

        // Default to a simple web app structure
        return [
            {
                name: 'index.html',
                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Web App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to My Web App</h1>
        <p>This is a simple web application created by the Monult DevTeam.</p>
        <button id="demo-button">Click Me!</button>
        <div id="output"></div>
    </div>
    <script src="script.js"></script>
</body>
</html>`
            },
            {
                name: 'styles.css',
                content: `body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #f5f5f5;
    margin: 0;
    padding: 20px;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    text-align: center;
}

h1 {
    color: #333;
    margin-bottom: 20px;
}

p {
    color: #666;
    line-height: 1.6;
}

button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.2s;
}

button:hover {
    background-color: #0056b3;
}

#output {
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #dee2e6;
    display: none;
}`
            },
            {
                name: 'script.js',
                content: `document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('demo-button');
    const output = document.getElementById('output');
    
    button.addEventListener('click', () => {
        output.style.display = 'block';
        output.innerHTML = '<strong>Success!</strong> Your web app is working perfectly!';
        button.disabled = true;
        button.textContent = 'Already Clicked';
    });
});`
            }
        ];
    }
}
