"use client"

import { useRef, useEffect } from "react"
import { ArrowUp, CornerDownLeft, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModelId } from "@/components/model-picker"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  tokens?: number
  cost?: string
  latency?: string
}

interface ChatAreaProps {
  messages: Message[]
  inputValue: string
  setInputValue: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  selectedModel: ModelId
  isStreaming?: boolean
}

const SUGGESTIONS = [
  {
    title: "Draft an API adapter",
    description: "Write a clean TypeScript provider factory for swappable models.",
  },
  {
    title: "Audit a smart contract",
    description: "Check for reentrancy bugs and suggest optimizations.",
  },
  {
    title: "Explain a technical concept",
    description: "Explain quantum key distribution simply using analogies.",
  },
  {
    title: "Refactor database query",
    description: "Optimize a pgvector hybrid retrieval query using Drizzle.",
  },
]

export function ChatArea({
  messages,
  inputValue,
  setInputValue,
  onSubmit,
  selectedModel,
  isStreaming = false,
}: ChatAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  // Auto-resize input textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [inputValue])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  const handleSuggestionClick = (title: string) => {
    setInputValue(title)
    textareaRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-[68ch] mx-auto w-full flex flex-col h-full justify-between">
          
          {isEmpty ? (
            /* Empty State Branding */
            <div className="flex-grow flex flex-col justify-center py-12 select-none">
              <div className="text-center space-y-6">
                {/* Brand Logo with Pulsing Highlight */}
                <div className="inline-flex relative group">
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-3xl shadow-xl z-10 transition-transform duration-300 group-hover:scale-105">
                    RR
                  </div>
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    How can RRGpt assist you today?
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    A precise, direct, and opinionated workspace optimized for developers and professionals.
                  </p>
                </div>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12 max-w-[600px] mx-auto w-full">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.title)}
                    className="flex flex-col text-left p-3.5 rounded-xl border border-border bg-card hover:border-accent hover:bg-secondary/40 transition-all duration-150 group focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <span className="font-semibold text-xs text-foreground group-hover:text-accent flex items-center gap-1">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      {s.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {s.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Feed */
            <div className="space-y-8 flex-grow">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col space-y-1.5 pb-6 border-b border-border/40 last:border-0",
                    m.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      {m.role === "user" ? "User" : "RRGpt"}
                    </span>
                    {m.role === "assistant" && (m.tokens || m.latency) && (
                      <span className="text-[9px] font-mono px-1 rounded bg-secondary text-muted-foreground border border-border/50">
                        {m.latency && `⏱️ ${m.latency}`}
                        {m.tokens && ` • 🪙 ${m.tokens} tkn`}
                        {m.cost && ` • ${m.cost}`}
                      </span>
                    )}
                  </div>
                  
                  <div className={cn(
                    "w-full text-base leading-relaxed whitespace-pre-wrap selection:bg-accent/20",
                    m.role === "user" ? "text-foreground font-medium bg-secondary/30 p-4 rounded-xl border border-border/30 max-w-[90%]" : "text-foreground"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Streaming Indicator */}
              {isStreaming && (
                <div className="flex flex-col space-y-1.5 items-start">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent animate-pulse">
                    Streaming...
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-4 bg-accent rounded-sm animate-pulse" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input Form Footer */}
      <div className="p-4 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0">
        <div className="max-w-[68ch] mx-auto w-full">
          <form
            onSubmit={onSubmit}
            className="relative rounded-2xl border border-border bg-card shadow-md flex items-end pr-2.5 pl-3 py-2.5 hover:border-accent/40 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all duration-150"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask RRGpt anything... (Press Enter to send)"
              className="flex-grow bg-transparent border-0 outline-none text-foreground placeholder-muted-foreground text-sm leading-relaxed max-h-[200px] py-1.5 resize-none pr-12 focus:ring-0 focus:outline-none"
            />
            <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 shrink-0">
              {inputValue.length > 0 && (
                <button
                  type="submit"
                  className="w-8 h-8 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center transition-colors shadow focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <ArrowUp className="w-4.5 h-4.5" />
                </button>
              )}
              <span className="hidden sm:flex items-center gap-1 text-[9px] font-mono text-muted-foreground px-1 bg-secondary rounded border border-border select-none h-5">
                <CornerDownLeft className="w-2.5 h-2.5" /> Enter
              </span>
            </div>
          </form>
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-muted-foreground/75 font-mono">
              Workspace configured with provider: <b className="text-accent">{selectedModel}</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
