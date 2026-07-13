"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useSession } from "next-auth/react"

export interface Conversation {
  id: string
  title: string
  isPinned: boolean
  model: string
  provider: string
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Message {
  id: string
  conversationId: string
  role: "system" | "user" | "assistant"
  content: string
  tokens?: number | null
  cost?: string | null
  latency?: number | null
  sources?: unknown | null
  createdAt: string | Date
}

interface ChatContextType {
  activeConversationId: string | null
  conversations: Conversation[]
  messages: Message[]
  selectedModel: string
  selectedProvider: string
  isStreaming: boolean
  input: string
  setInput: (input: string) => void
  setSelectedModel: (model: string) => void
  setSelectedProvider: (provider: string) => void
  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  startNewConversation: () => void
  sendMessage: (content: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  togglePinConversation: (id: string, isPinned: boolean) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Telemetry and pricing configurations matching model-picker.tsx
export const PRICING_SHEET: Record<string, Record<string, { input: number; output: number }>> = {
  google: {
    "gemini-1.5-flash": { input: 0.075, output: 0.30 },
    "gemini-1.5-pro": { input: 1.25, output: 5.00 },
    "gemini-2.0-flash-exp": { input: 0.00, output: 0.00 },
  },
  openai: {
    "gpt-4o-mini": { input: 0.15, output: 0.60 },
    "gpt-4o": { input: 2.50, output: 10.00 },
  },
  ollama: {
    "llama3": { input: 0.00, output: 0.00 },
    "mistral": { input: 0.00, output: 0.00 },
  },
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("google")
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-flash")
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [input, setInput] = useState<string>("")

  // Helper declarations hoisted above hook consumers

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (e) {
      console.error("Failed to load conversations:", e)
    }
  }

  const selectConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setActiveConversationId(data.id)
        setMessages(data.messages || [])
        setSelectedModel(data.model)
        setSelectedProvider(data.provider)
      }
    } catch (e) {
      console.error("Failed to select conversation:", e)
    }
  }

  const startNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
  }

  const renameConversation = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, title } : c))
        )
      }
    } catch (e) {
      console.error("Failed to rename conversation:", e)
    }
  }

  const togglePinConversation = async (id: string, isPinned: boolean) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      })
      if (res.ok) {
        setConversations(prev => {
          const updated = prev.map(c => (c.id === id ? { ...c, isPinned } : c))
          // Re-sort: pinned first, then updatedAt desc
          return updated.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })
        })
      }
    } catch (e) {
      console.error("Failed to pin conversation:", e)
    }
  }

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (activeConversationId === id) {
          startNewConversation()
        }
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return

    let activeId = activeConversationId
    const currentModel = selectedModel
    const currentProvider = selectedProvider

    setIsStreaming(true)
    setInput("")

    try {
      // 1. Create a conversation thread if none is active
      if (!activeId) {
        const titleText = content.substring(0, 40) + (content.length > 40 ? "..." : "")
        const resConv = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titleText,
            model: currentModel,
            provider: currentProvider,
          }),
        })

        if (!resConv.ok) throw new Error("Failed to create conversation")
        const newConv = await resConv.json()
        activeId = newConv.id
        setActiveConversationId(activeId)
        setConversations(prev => [newConv, ...prev])
      }

      // 2. Append User Message to UI State & Database
      const userMsgLocal: Message = {
        id: crypto.randomUUID(),
        conversationId: activeId!,
        role: "user",
        content,
        createdAt: new Date(),
      }

      setMessages(prev => [...prev, userMsgLocal])

      const resUserMsg = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content,
        }),
      })

      if (!resUserMsg.ok) throw new Error("Failed to save user message")

      // 3. Setup temporary Assistant Message state for streaming
      const assistantMsgId = crypto.randomUUID()
      const assistantMsgLocal: Message = {
        id: assistantMsgId,
        conversationId: activeId!,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }

      setMessages(prev => [...prev, assistantMsgLocal])

      // 4. Invoke LLM streaming API
      // Build standard model message history
      const history = messages
        .concat(userMsgLocal)
        .map(m => ({ role: m.role, content: m.content }))

      const resStream = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          model: currentModel,
          provider: currentProvider,
        }),
      })

      if (!resStream.ok) {
        const errJson = await resStream.json().catch(() => ({}))
        throw new Error(errJson.error || "Failed to communicate with LLM gateway")
      }

      // Parse citations sources header
      const sourcesHeader = resStream.headers.get("X-Sources")
      let sourcesList = []
      if (sourcesHeader) {
        try {
          sourcesList = JSON.parse(decodeURIComponent(sourcesHeader))
        } catch (e) {
          console.error("Failed to parse sources header:", e)
        }
      }

      if (!resStream.body) throw new Error("No response body received")

      const reader = resStream.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let streamContent = ""
      const startTime = Date.now()

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value, { stream: !done })
          streamContent += chunk
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: streamContent, sources: sourcesList } : m))
          )
        }
      }

      const latencyMs = Date.now() - startTime

      // Estimate tokens
      const promptTokens = Math.ceil(content.length / 4.0)
      const completionTokens = Math.ceil(streamContent.length / 4.0)
      const totalTokens = promptTokens + completionTokens

      // Calculate cost
      const modelPricing = PRICING_SHEET[currentProvider]?.[currentModel]
      let costStr = "0.000000"
      if (modelPricing) {
        const inputCost = (promptTokens / 1000000.0) * modelPricing.input
        const outputCost = (completionTokens / 1000000.0) * modelPricing.output
        costStr = (inputCost + outputCost).toFixed(6)
      }

      // 5. Log final Assistant message in Database
      const resAssistantMsg = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          content: streamContent,
          tokens: totalTokens,
          cost: costStr,
          latency: latencyMs,
          sources: sourcesList,
        }),
      })

      if (resAssistantMsg.ok) {
        const savedMsg = await resAssistantMsg.json()
        // Replace temp local assistant message with database persisted entity (has timestamps, etc.)
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? savedMsg : m))
        )
      }

      // Refresh list to pull updated timestamps
      loadConversations()
    } catch (error: unknown) {
      console.error("Send message error:", error)
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred."
      
      // Update UI to show error in stream message or notify
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversationId: activeId || "error",
          role: "assistant",
          content: `⚠️ Error: ${errorMsg}`,
          createdAt: new Date(),
        },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (status === "authenticated") {
      loadConversations()
    } else {
      setConversations([])
      setMessages([])
      setActiveConversationId(null)
    }
  }, [status])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <ChatContext.Provider
      value={{
        activeConversationId,
        conversations,
        messages,
        selectedModel,
        selectedProvider,
        isStreaming,
        input,
        setInput,
        setSelectedModel,
        setSelectedProvider,
        loadConversations,
        selectConversation,
        startNewConversation,
        sendMessage,
        renameConversation,
        togglePinConversation,
        deleteConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
