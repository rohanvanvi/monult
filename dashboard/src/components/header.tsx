/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { ReactNode } from "react";

interface HeaderProps {
    title: string;
    subtitle: string;
    children?: ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
    return (
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
                <div className="text-[var(--text-secondary)] text-sm mt-1">
                    {subtitle}
                </div>
            </div>
            {children && (
                <div className="flex gap-3">
                    {children}
                </div>
            )}
        </div>
    );
}
