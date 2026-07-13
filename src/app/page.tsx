"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ChatArea } from "@/components/chat-area"
import { ChatProvider, useChat } from "@/contexts/chat-context"

function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  
  const {
    activeConversationId,
    conversations,
    messages,
    selectedModel,
    isStreaming,
    input,
    setInput,
    setSelectedModel,
    setSelectedProvider,
    selectConversation,
    startNewConversation,
    sendMessage,
    renameConversation,
    togglePinConversation,
    deleteConversation,
  } = useChat()

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

  // Keyboard shortcut listener (Ctrl+\ to toggle sidebar, Ctrl+M for new chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault()
        setIsSidebarOpen((prev) => !prev)
      }
      if (e.ctrlKey && e.key === "m") {
        e.preventDefault()
        startNewConversation()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [startNewConversation])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
  }

  const handleTogglePin = async (id: string) => {
    const target = conversations.find(c => c.id === id)
    if (target) {
      await togglePinConversation(id, !target.isPinned)
    }
  }

  const handleModelChange = (modelId: string, providerId: string) => {
    setSelectedModel(modelId)
    setSelectedProvider(providerId)
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const activeTitle = activeConversation ? activeConversation.title : "RRGpt Workspace"

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        conversations={conversations}
        activeId={activeConversationId}
        setActiveId={(id) => id && selectConversation(id)}
        onNewChat={startNewConversation}
        onDelete={deleteConversation}
        onTogglePin={handleTogglePin}
        onRename={renameConversation}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <Header
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          activeTitle={activeTitle}
        />

        <ChatArea
          messages={messages}
          inputValue={input}
          setInputValue={setInput}
          onSubmit={handleSendMessage}
          selectedModel={selectedModel}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}

export default function WorkspacePageWrapper() {
  return (
    <ChatProvider>
      <WorkspacePage />
    </ChatProvider>
  )
}
