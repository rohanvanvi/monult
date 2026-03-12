/*
 Monult AI Platform
 Created by Rohan Vanvi
 https://github.com/rohanvanvi/Monult

 Copyright (c) 2026 Rohan Vanvi
 Licensed under the Apache License, Version 2.0
*/

"use client";
import { useState, useEffect } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import {
  Activity,
  RefreshCcw,
  Cpu,
  Zap,
  DollarSign,
  Clock,
  ArrowUpRight,
  Server,
} from "lucide-react";

function StatSkeleton() {
  return (
    <Card className="glass-card border-[var(--border)]">
      <CardContent className="p-5">
        <Skeleton className="h-3 w-20 mb-3 bg-[var(--bg-elevated)]" />
        <Skeleton className="h-8 w-28 mb-2 bg-[var(--bg-elevated)]" />
        <Skeleton className="h-3 w-16 bg-[var(--bg-elevated)]" />
      </CardContent>
    </Card>
  );
}

const SKELETON_HEIGHTS = [65, 40, 78, 50, 35, 60, 45, 72, 38, 55, 82, 48];

function ChartSkeleton() {
  return (
    <div className="h-[220px] flex items-end gap-2 p-4">
      {SKELETON_HEIGHTS.map((h, i) => (
        <Skeleton
          key={i}
          className="flex-1 bg-[var(--bg-elevated)] rounded-t-sm"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, refetch, error } = useDashboardData();
  const [refreshing, setRefreshing] = useState(false);
  const [currentUptime, setCurrentUptime] = useState(0);

  useEffect(() => {
    if (data?.health?.uptime) {
      setCurrentUptime(Math.floor(data.health.uptime));
    }
  }, [data?.health?.uptime]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const cost = data.cost || {};
  const health = data.health || {};
  const providerCount = data.providers.length;
  const totalRequests = cost.totalRequests || 0;
  const totalTokens = cost.totalTokens || 0;
  const totalCost = cost.totalCost || 0;
  const uptime = currentUptime;

  const chartEntries = (cost.entries || []).slice(-12).map((e: any, i: number) => ({
    name: `#${i + 1}`,
    tokens: e.usage?.totalTokens || 0,
    cost: e.estimatedCost || 0,
  }));

  const CHART_COLORS = ["#4f6ef7", "#9b5de5", "#2dd4a8", "#06d6f0", "#f5a623"];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time overview of your AI infrastructure
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <Badge variant="destructive" className="text-xs animate-pulse-soft">
              API Offline
            </Badge>
          )}
          {!error && !loading && (
            <Badge className="bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] mr-1.5 inline-block" />
              Connected
            </Badge>
          )}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="gap-2 border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
          >
            <RefreshCcw className={`w-3.5 h-3.5 transition-transform ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refresh" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Card className="glass-card border-[var(--border)] group hover:border-[var(--accent-blue)]/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Providers</span>
                  <Server className="w-4 h-4 text-[var(--accent-blue)]" />
                </div>
                <div className="text-3xl font-bold text-white font-mono">{providerCount}</div>
                <div className="text-xs text-[var(--accent-green)] mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  All Active
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[var(--border)] group hover:border-[var(--accent-purple)]/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Requests</span>
                  <Zap className="w-4 h-4 text-[var(--accent-purple)]" />
                </div>
                <div className="text-3xl font-bold text-white font-mono">{totalRequests.toLocaleString()}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Total processed</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[var(--border)] group hover:border-[var(--accent-cyan)]/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Tokens</span>
                  <Cpu className="w-4 h-4 text-[var(--accent-cyan)]" />
                </div>
                <div className="text-3xl font-bold text-white font-mono">{totalTokens.toLocaleString()}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Total usage</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[var(--border)] group hover:border-[var(--accent-green)]/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Cost</span>
                  <DollarSign className="w-4 h-4 text-[var(--accent-green)]" />
                </div>
                <div className="text-3xl font-bold text-white font-mono">${totalCost.toFixed(4)}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Accumulated</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts & System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-card border-[var(--border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
              <Activity className="w-4 h-4 text-[var(--accent-blue)]" />
              Token Usage
              <span className="text-[var(--text-faint)] font-normal ml-auto text-xs">Last 12 requests</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : chartEntries.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-[var(--text-muted)]">
                No request data yet. Send your first request to see usage here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartEntries} barSize={20}>
                  <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-faint)" fontSize={10} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 20, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#ffffff",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                    labelStyle={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "4px" }}
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  />
                  <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                    {chartEntries.map((_: any, index: number) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-[var(--border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-[var(--accent-amber)]" />
              System Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-[var(--bg-elevated)]" />
                <Skeleton className="h-4 w-3/4 bg-[var(--bg-elevated)]" />
                <Skeleton className="h-4 w-2/3 bg-[var(--bg-elevated)]" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-xs text-[var(--text-muted)]">Version</span>
                  <span className="text-xs font-mono text-white">{health.version || "1.0.0"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-xs text-[var(--text-muted)]">Uptime</span>
                  <span className="text-xs font-mono text-[var(--accent-green)]">
                    {uptime > 3600
                      ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
                      : `${Math.floor(uptime / 60)}m ${uptime % 60}s`}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-xs text-[var(--text-muted)]">Agents</span>
                  <span className="text-xs font-mono text-white">{data.agents.length}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-[var(--text-muted)]">Models</span>
                  <span className="text-xs font-mono text-white">{data.models.length}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
