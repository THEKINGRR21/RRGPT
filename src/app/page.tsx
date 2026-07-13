"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar, Conversation } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ChatArea } from "@/components/chat-area"
import { ModelId } from "@/components/model-picker"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  tokens?: number
  cost?: string
  latency?: string
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    title: "Drizzle Hybrid Search",
    isPinned: true,
    model: "gemini-flash",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "conv-2",
    title: "RRGpt Persona Audit",
    isPinned: false,
    model: "gemini-pro",
    updatedAt: new Date().toISOString(),
  },
]

const INITIAL_MESSAGES: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "msg-1-1",
      role: "user",
      content: "Can you draft a clean Drizzle search query that merges full-text search and vector similarity? We need to use pgvector.",
    },
    {
      id: "msg-1-2",
      role: "assistant",
      content: "Here is the exact Drizzle ORM implementation for hybrid vector and full-text search. This uses `sql` template literals to combine cosine similarity and websearch_to_tsquery ranking.\n\n```typescript\nimport { db } from '@/db';\nimport { documents, documentChunks } from '@/db/schema';\nimport { sql, cosineDistance, desc } from 'drizzle-orm';\n\nexport async function hybridSearch(queryText: string, queryEmbedding: number[], limit = 5) {\n  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;\n  const textRank = sql<number>`ts_rank(to_tsvector('english', ${documentChunks.content}), websearch_to_tsquery('english', ${queryText}))`;\n\n  // Compute a weighted normalization score (Reciprocal Rank Fusion)\n  return await db\n    .select({\n      id: documentChunks.id,\n      content: documentChunks.content,\n      documentId: documentChunks.documentId,\n      score: sql<number>`(0.5 * ${similarity}) + (0.5 * ${textRank})`\n    })\n    .from(documentChunks)\n    .orderBy((t) => desc(t.score))\n    .limit(limit);\n}\n```\n\nThis combines syntactic matching with semantic vector space similarity directly in a single database round-trip. It is fast, clean, and requires no secondary data-stores.",
      tokens: 284,
      cost: "$0.02",
      latency: "185ms",
    },
  ],
  "conv-2": [
    {
      id: "msg-2-1",
      role: "user",
      content: "What is your main operating directive as RRGpt?",
    },
    {
      id: "msg-2-2",
      role: "assistant",
      content: "I operate under a strict precision directive. I lead with direct answers, reject padding/flattery, and never open with conversational fillers like 'Great question.' When uncertain, I state my limitations clearly. When referencing documents, I rely entirely on verifiable sources and cite them inline.",
      tokens: 62,
      cost: "$0.08",
      latency: "410ms",
    },
  ],
}

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-flash")
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [activeId, setActiveId] = useState<string | null>("conv-1")
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES)
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)

  // Listen to window size to close sidebar by default on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleNewChat = useCallback(() => {
    const newId = `conv-${Date.now()}`
    const newConv: Conversation = {
      id: newId,
      title: "Untitled Conversation",
      isPinned: false,
      model: selectedModel,
      updatedAt: new Date().toISOString(),
    }
    setConversations((prev) => [newConv, ...prev])
    setAllMessages((prev) => ({ ...prev, [newId]: [] }))
    setActiveId(newId)
  }, [selectedModel])

  // Keyboard shortcut listener (Ctrl+\ to toggle sidebar, Ctrl+M for new chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault()
        setIsSidebarOpen((prev) => !prev)
      }
      if (e.ctrlKey && e.key === "m") {
        e.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleNewChat])

  const handleDeleteChat = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setAllMessages((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    if (activeId === id) {
      setActiveId(null)
    }
  }

  const handleTogglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    )
  }

  const handleRenameChat = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    )
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !activeId) return

    const userMsg: Message = {
      id: `msg-usr-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
    }

    // Append user message
    setAllMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), userMsg],
    }))
    setInputValue("")
    setIsStreaming(true)

    // Simulate Streaming reply (mock)
    setTimeout(() => {
      const assistantMsg: Message = {
        id: `msg-ast-${Date.now()}`,
        role: "assistant",
        content: `Acknowledged. I am operating under local demonstration mode for Phase 1. You queried: "${userMsg.content}". In the next phase, this prompt will trigger live streaming inference against the selected model (${selectedModel}).`,
        tokens: 38,
        cost: "$0.00",
        latency: "120ms",
      }
      setAllMessages((prev) => ({
        ...prev,
        [activeId]: [...(prev[activeId] || []), assistantMsg],
      }))
      setIsStreaming(false)
      
      // Update thread title if it was "Untitled Conversation"
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeId && c.title === "Untitled Conversation") {
            return { ...c, title: userMsg.content.slice(0, 30) + (userMsg.content.length > 30 ? "..." : "") }
          }
          return c
        })
      )
    }, 1200)
  }

  const activeConversation = conversations.find((c) => c.id === activeId)
  const activeTitle = activeConversation ? activeConversation.title : "RRGpt Workspace"
  const currentMessages = activeId ? allMessages[activeId] || [] : []

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        conversations={conversations}
        activeId={activeId}
        setActiveId={setActiveId}
        onNewChat={handleNewChat}
        onDelete={handleDeleteChat}
        onTogglePin={handleTogglePin}
        onRename={handleRenameChat}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <Header
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          activeTitle={activeTitle}
        />

        <ChatArea
          messages={currentMessages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSubmit={handleSendMessage}
          selectedModel={selectedModel}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}
