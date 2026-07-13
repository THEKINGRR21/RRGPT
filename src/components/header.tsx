"use client"

import { PanelLeftOpen, Shield } from "lucide-react"
import { ModelPicker, ModelId } from "@/components/model-picker"

interface HeaderProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  selectedModel: ModelId
  onModelChange: (id: ModelId) => void
  activeTitle: string
}

export function Header({
  isSidebarOpen,
  setIsSidebarOpen,
  selectedModel,
  onModelChange,
  activeTitle,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-accent"
            title="Open sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
            {activeTitle || "RRGpt Workspace"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* RAG status indicator */}
        <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-secondary text-muted-foreground border border-border">
          <Shield className="w-3 h-3 text-accent" /> RAG Engine: Active
        </span>

        {/* Model Picker */}
        <ModelPicker selectedModel={selectedModel} onChange={onModelChange} />
      </div>
    </header>
  )
}
