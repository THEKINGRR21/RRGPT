"use client"

import React, { useRef, useEffect } from "react"
import { ArrowUp, CornerDownLeft, Sparkles, Copy, Check, BookOpen, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { cn } from "@/lib/utils"
import { Message } from "@/contexts/chat-context"

import "katex/dist/katex.min.css"

interface ChatAreaProps {
  messages: Message[]
  inputValue: string
  setInputValue: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  selectedModel: string
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
            <div className="flex-grow flex flex-col justify-center py-12 select-none animate-fade-in">
              <div className="text-center space-y-6">
                {/* Brand Logo with Pulsing Highlight */}
                <div className="inline-flex relative group">
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-3xl shadow-xl z-10 transition-transform duration-300 group-hover:scale-105">
                    RR
                  </div>
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
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
                    className="flex flex-col text-left p-3.5 rounded-xl border border-border bg-card hover:border-accent hover:bg-secondary/45 transition-all duration-150 group focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <span className="font-semibold text-xs text-foreground group-hover:text-accent flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-accent" />
                      {s.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      {s.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Feed */
            <div className="space-y-10 flex-grow">
              {messages.map((m) => {
                const latencyText = m.latency 
                  ? m.latency >= 1000 
                    ? `${(m.latency / 1000).toFixed(2)}s` 
                    : `${m.latency}ms`
                  : null

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col space-y-2.5 pb-8 border-b border-border/25 last:border-0",
                      m.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        {m.role === "user" ? "User" : "RRGpt"}
                      </span>
                      {m.role === "assistant" && (m.tokens || m.latency) && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50 select-none">
                          {latencyText && `⏱️ ${latencyText}`}
                          {m.tokens && ` • 🪙 ${m.tokens} tkn`}
                          {m.cost && ` • $${m.cost}`}
                        </span>
                      )}
                    </div>
                    
                    <div className={cn(
                      "w-full selection:bg-accent/25 tracking-wide",
                      m.role === "user" 
                        ? "text-sm font-semibold bg-secondary/50 p-4 rounded-2xl border border-border/40 max-w-[85%] text-foreground/90 font-sans whitespace-pre-wrap" 
                        : "text-[15px] font-serif leading-relaxed text-foreground/90 py-1"
                    )}>
                      {m.role === "user" ? (
                        m.content
                      ) : (
                        <>
                          <MarkdownRenderer content={m.content} />
                          {m.sources && Array.isArray(m.sources) && m.sources.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 animate-fade-in select-none">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 w-full mb-1">
                                <BookOpen className="w-3.5 h-3.5 text-accent" /> Retrieved Sources:
                              </span>
                              {m.sources.map((src, idx) => {
                                const item = src as { documentName: string; score: number; content: string }
                                return (
                                  <div
                                    key={idx}
                                    className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary hover:bg-secondary/70 border border-border/50 text-[10px] font-mono text-muted-foreground cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-accent" />
                                    <span>{item.documentName}</span>
                                    <span className="text-[8px] font-sans px-1 rounded bg-accent/15 text-accent border border-accent/25">
                                      {typeof item.score === 'number' ? `${(item.score * 100).toFixed(0)}%` : 'match'}
                                    </span>
                                    
                                    <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto absolute bottom-full left-0 mb-2 w-72 p-3 bg-card border border-border rounded-xl shadow-xl z-50 text-[11px] font-sans text-foreground/90 transition-all duration-150 transform translate-y-1 group-hover:translate-y-0 leading-relaxed max-h-40 overflow-y-auto">
                                      <span className="font-bold text-accent block mb-1">Match Snippet:</span>
                                      {"\""}{item.content}{"\""}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Streaming Indicator */}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
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
      <div className="p-4 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0 border-t border-border/20">
        <div className="max-w-[68ch] mx-auto w-full">
          <form
            onSubmit={onSubmit}
            className="relative rounded-2xl border border-border bg-card shadow-sm flex items-end pr-2.5 pl-3 py-2.5 hover:border-accent/40 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all duration-150"
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
            <span className="text-[10px] text-muted-foreground/75 font-mono select-none">
              Active Model: <b className="text-accent">{selectedModel}</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          const codeString = String(children).replace(/\n$/, "")
          return match ? (
            <CodeBlock language={match[1]} value={codeString} {...props} />
          ) : (
            <code className={cn("px-1.5 py-0.5 rounded bg-secondary font-mono text-sm border border-border/50 text-accent font-semibold", className)} {...props}>
              {children}
            </code>
          )
        },
        p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
        h1: ({ children }) => <h1 className="text-lg font-bold mt-6 mb-2 tracking-tight text-foreground font-sans">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold mt-5 mb-2 tracking-tight text-foreground font-sans">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mt-4 mb-1.5 tracking-tight text-foreground font-sans">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="pl-4 border-l-2 border-accent text-muted-foreground italic my-4 bg-secondary/15 py-2.5 pr-2 rounded-r-lg font-sans text-sm">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto border border-border rounded-lg shadow-sm">
            <table className="w-full text-left border-collapse text-xs font-sans">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-secondary/60 border-b border-border font-semibold text-foreground">{children}</thead>,
        th: ({ children }) => <th className="p-2.5 font-semibold">{children}</th>,
        td: ({ children }) => <td className="p-2.5 border-t border-border/50 text-foreground/80">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function CodeBlock({ language, value, ...props }: { language: string; value: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border/55 shadow-sm font-sans">
      <div className="bg-secondary/70 px-4 py-2 flex items-center justify-between border-b border-border/40 text-[10px] font-mono text-muted-foreground select-none">
        <span className="uppercase">{language}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground active:scale-95 transition-all text-[10px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        {...props}
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{ 
          margin: 0, 
          padding: "1.25rem", 
          fontSize: "0.85rem", 
          background: "#161617",
          lineHeight: "1.5"
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}
