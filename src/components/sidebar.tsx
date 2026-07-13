"use client"

import { useState } from "react"
import { 
  MessageSquare, 
  Search, 
  Pin, 
  Trash2, 
  Edit3, 
  Plus, 
  PanelLeftClose, 
  Database,
  Check,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession, signIn, signOut } from "next-auth/react"

export interface Conversation {
  id: string
  title: string
  isPinned: boolean
  model: string
  updatedAt: string | Date
}

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  conversations: Conversation[]
  activeId: string | null
  setActiveId: (id: string | null) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onRename: (id: string, newTitle: string) => void
}

export function Sidebar({
  isOpen,
  setIsOpen,
  conversations,
  activeId,
  setActiveId,
  onNewChat,
  onDelete,
  onTogglePin,
  onRename,
}: SidebarProps) {
  const { data: session } = useSession()
  const user = session?.user
  const initials = user?.name 
    ? user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() 
    : "U"

  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned)
  const recentConversations = filteredConversations.filter((c) => !c.isPinned)

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(c.id)
    setEditingTitle(c.title)
  }

  const saveRename = (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (editingTitle.trim()) {
      onRename(id, editingTitle.trim())
    }
    setEditingId(null)
  }

  const cancelRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  return (
    <aside
      className={cn(
        "h-full border-r border-border bg-card flex flex-col transition-all duration-200 relative overflow-hidden",
        isOpen ? "w-64" : "w-0 border-r-0"
      )}
      aria-label="Sidebar Navigation"
    >
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between gap-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
            RR
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">RRGpt</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Action Area: New Chat */}
      <div className="p-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Conversation List Scrollable */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {/* Pinned section */}
        {pinnedConversations.length > 0 && (
          <div>
            <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Pin className="w-3 h-3 text-accent shrink-0 rotate-45" />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">
              {pinnedConversations.map((c) => renderConversationItem(c))}
            </div>
          </div>
        )}

        {/* Recents section */}
        <div>
          {pinnedConversations.length > 0 && recentConversations.length > 0 && (
            <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-4">
              <span>Recent Conversations</span>
            </div>
          )}
          <div className="space-y-0.5">
            {recentConversations.map((c) => renderConversationItem(c))}
          </div>
          {filteredConversations.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No conversations found
            </div>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="p-3 border-t border-border bg-secondary/30 shrink-0 flex flex-col gap-2.5">
        {/* Status indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1.5 font-mono">
            <Database className="w-3.5 h-3.5 text-emerald-500" /> DB Connected
          </span>
          <span className="text-[10px] font-mono px-1 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">
            Free Trial
          </span>
        </div>

        {/* User / Theme section */}
        <div className="flex items-center justify-between gap-2">
          {user ? (
            <div className="flex items-center gap-2 overflow-hidden flex-1 group/user relative items-center">
              <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent text-xs shrink-0 select-none">
                {initials}
              </div>
              <div className="flex flex-col text-left overflow-hidden flex-1">
                <span className="font-semibold text-xs text-foreground truncate">{user.name || "User"}</span>
                <span className="text-[9px] text-muted-foreground truncate">{user.email || ""}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="opacity-0 group-hover/user:opacity-100 px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-rose-500 rounded bg-secondary hover:bg-secondary/80 absolute right-0 transition-opacity"
                title="Sign out"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => signIn()}
                className="flex-1 text-center py-1.5 px-3 rounded bg-secondary hover:bg-secondary/80 text-xs text-foreground font-semibold border border-border"
              >
                Sign In
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )

  function renderConversationItem(c: Conversation) {
    const isSelected = activeId === c.id
    const isEditing = editingId === c.id

    return (
      <div
        key={c.id}
        onClick={() => !isEditing && setActiveId(c.id)}
        className={cn(
          "group flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer relative",
          isSelected 
            ? "bg-secondary text-foreground font-medium" 
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
        )}
      >
        {isEditing ? (
          <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="flex-1 px-1.5 py-0.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename(c.id, e)
                if (e.key === "Escape") cancelRename(e)
              }}
            />
            <button
              onClick={(e) => saveRename(c.id, e)}
              className="p-0.5 text-emerald-500 hover:bg-secondary rounded"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={cancelRename}
              className="p-0.5 text-rose-500 hover:bg-secondary rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground/75" />
              <span className="truncate pr-2">{c.title}</span>
            </div>
            
            {/* Quick Actions (shown on hover, or if selected) */}
            <div className={cn(
              "flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gradient-to-l pl-2",
              isSelected ? "from-secondary" : "from-card group-hover:from-secondary/40"
            )}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin(c.id)
                }}
                className="p-1 text-muted-foreground hover:text-accent rounded hover:bg-secondary/80"
                title={c.isPinned ? "Unpin thread" : "Pin thread"}
              >
                <Pin className={cn("w-3 h-3", c.isPinned && "rotate-45 text-accent")} />
              </button>
              <button
                onClick={(e) => startRename(c, e)}
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary/80"
                title="Rename thread"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(c.id)
                }}
                className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-secondary/80"
                title="Delete thread"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    )
  }
}
