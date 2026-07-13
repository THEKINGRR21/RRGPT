"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Cpu, 
  TrendingUp, 
  Database, 
  Clock, 
  DollarSign, 
  Layers 
} from "lucide-react"

interface ProviderUsage {
  provider: string
  tokens: number
  cost: number
}

interface TelemetryData {
  conversationsCount: number
  messagesCount: number
  totalTokens: number
  avgLatency: number
  totalCost: number
  providers: ProviderUsage[]
}

export default function DashboardPage() {
  const [data, setData] = useState<TelemetryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetch("/api/telemetry")
        if (res.ok) {
          const stats = await res.json()
          setData(stats)
        }
      } catch (err) {
        console.error("Failed to load telemetry stats:", err)
      } finally {
        setLoading(false)
      }
    }
    loadTelemetry()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl animate-pulse">
            RR
          </div>
          <span className="text-xs font-mono text-muted-foreground animate-pulse mt-2">Loading Telemetry Metrics...</span>
        </div>
      </div>
    )
  }

  const stats = data || {
    conversationsCount: 0,
    messagesCount: 0,
    totalTokens: 0,
    avgLatency: 0,
    totalCost: 0,
    providers: []
  }

  // Find max tokens for relative sizing in charts
  const maxTokens = Math.max(...stats.providers.map(p => p.tokens), 1)
  const maxCost = Math.max(...stats.providers.map(p => p.cost), 0.000001)

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-y-auto selection:bg-accent/25">
      {/* Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between pb-6 border-b border-border/50">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-150 flex items-center justify-center"
              title="Return to Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">RRGpt Admin Portal</h1>
              <p className="text-xs text-muted-foreground font-mono">System-wide consumption & latency logs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              ● Live Diagnostics
            </span>
          </div>
        </div>

        {/* Diagnostic Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card: Chats */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Conversations</span>
              <Database className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold tracking-tight">{stats.conversationsCount}</span>
              <p className="text-[10px] text-muted-foreground font-mono">Thread logs stored</p>
            </div>
          </div>

          {/* Card: Messages */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Messages</span>
              <Layers className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold tracking-tight">{stats.messagesCount}</span>
              <p className="text-[10px] text-muted-foreground font-mono">Prompt cycles logged</p>
            </div>
          </div>

          {/* Card: Tokens */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tokens Consumed</span>
              <Cpu className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold tracking-tight">{stats.totalTokens.toLocaleString()}</span>
              <p className="text-[10px] text-muted-foreground font-mono">Accumulated load</p>
            </div>
          </div>

          {/* Card: Cost */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Estimated Cost</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold tracking-tight text-emerald-500">${stats.totalCost.toFixed(4)}</span>
              <p className="text-[10px] text-muted-foreground font-mono">USD delta billing</p>
            </div>
          </div>

          {/* Card: Latency */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Average Latency</span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold tracking-tight text-rose-500">{stats.avgLatency}ms</span>
              <p className="text-[10px] text-muted-foreground font-mono">Mean turn cycle speed</p>
            </div>
          </div>
        </div>

        {/* Charts & Breakdowns Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart Card: Tokens Share */}
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h2 className="text-sm font-semibold tracking-tight">Token Throughput by Provider</h2>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            
            <div className="space-y-4">
              {stats.providers.map(p => {
                const percentage = (p.tokens / maxTokens) * 100
                return (
                  <div key={p.provider} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="capitalize">{p.provider}</span>
                      <span className="font-mono text-muted-foreground">{p.tokens.toLocaleString()} tkn</span>
                    </div>
                    <div className="w-full h-3 bg-secondary rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full bg-accent rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {stats.providers.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  No provider logs recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Chart Card: Cost Share */}
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h2 className="text-sm font-semibold tracking-tight">USD Cost Delta by Provider</h2>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            
            <div className="space-y-4">
              {stats.providers.map(p => {
                const percentage = (p.cost / maxCost) * 100
                return (
                  <div key={p.provider} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="capitalize">{p.provider}</span>
                      <span className="font-mono text-emerald-500 font-bold">${p.cost.toFixed(6)}</span>
                    </div>
                    <div className="w-full h-3 bg-secondary rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {stats.providers.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  No provider logs recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
