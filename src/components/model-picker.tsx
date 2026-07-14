"use client"

import { useState, useRef, useEffect } from "react"
import { Cpu, ChevronDown, Zap, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ModelOption {
  id: string
  name: string
  provider: "google" | "openai" | "ollama"
  providerLabel: string
  latency: string
  inputCost: string // Per 1M tokens
  outputCost: string // Per 1M tokens
  contextWindow: string
  description: string
  badge?: string
}

export const MODELS: ModelOption[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    providerLabel: "Google",
    latency: "~120ms",
    inputCost: "$0.075",
    outputCost: "$0.30",
    contextWindow: "2M",
    description: "Fastest response, ideal for code generation and quick responses.",
    badge: "Speed Optimized",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    providerLabel: "Google",
    latency: "~350ms",
    inputCost: "$1.25",
    outputCost: "$5.00",
    contextWindow: "4M",
    description: "High intelligence for complex reasoning, multi-turn logic, and long RAG context.",
    badge: "Reasoning",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerLabel: "OpenAI",
    latency: "~200ms",
    inputCost: "$0.15",
    outputCost: "$0.60",
    contextWindow: "128k",
    description: "Highly capable and cost-effective model for daily tasks.",
  },
  {
    id: "llama3",
    name: "Llama 3 (Ollama)",
    provider: "ollama",
    providerLabel: "Ollama",
    latency: "~50ms",
    inputCost: "$0.00",
    outputCost: "$0.00",
    contextWindow: "8k",
    description: "Runs fully locally on your hardware. Zero data leak, zero cost.",
    badge: "Local / Offline",
  },
]

interface ModelPickerProps {
  selectedModel: string
  onChange: (modelId: string, providerId: string) => void
}

export function ModelPicker({ selectedModel, onChange }: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium transition-all duration-150 hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-accent select-none",
          isOpen && "bg-secondary"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Cpu className="w-4 h-4 text-accent" />
        <span className="font-semibold">{currentModel.name}</span>
        <span className="text-xs text-muted-foreground font-mono px-1.5 py-0.5 bg-secondary rounded border border-border capitalize">
          {currentModel.provider}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-150", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden divide-y divide-border animate-fade-in">
          <div className="px-3 py-2 bg-secondary/50 select-none">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Model Provider</span>
          </div>
          <div className="py-1 max-h-[350px] overflow-y-auto" role="listbox">
            {MODELS.map((model) => {
              const isSelected = model.id === selectedModel
              return (
                <button
                  key={model.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(model.id, model.provider)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "flex flex-col w-full text-left px-4 py-2.5 hover:bg-secondary/70 transition-colors duration-150 focus:outline-none focus:bg-secondary",
                    isSelected && "bg-secondary"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm text-foreground">{model.name}</span>
                    {model.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {model.description}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-accent" /> {model.latency}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> {model.contextWindow} ctx
                    </span>
                    <span>
                      In: {model.inputCost} / Out: {model.outputCost}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
