/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Cell } from "recharts";

interface TokenChartProps {
    data: number[];
}

export function TokenChart({ data }: TokenChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-[var(--text-muted)] text-[13px]">
                No requests yet
            </div>
        );
    }

    // Format data for Recharts
    const chartData = data.slice(-12).map((val, i) => ({
        name: `R${i + 1}`,
        value: val,
        fill: ["var(--accent-blue)", "var(--accent-purple)", "var(--accent-green)", "var(--accent-cyan)"][i % 4]
    }));

    return (
        <div className="h-[200px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip
                        cursor={{ fill: 'var(--bg-hover)' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-white shadow-xl">
                                        {payload[0].value} tokens
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        dy={8}
                    />
                    <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        className="transition-all duration-300 hover:opacity-80"
                    >
                        {
                            chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))
                        }
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
