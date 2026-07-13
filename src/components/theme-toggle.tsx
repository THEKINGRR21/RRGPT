"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return <div className="w-9 h-9 rounded-md bg-transparent" />
  }

  const themes = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-secondary border border-border">
      {themes.map((t) => {
        const Icon = t.icon
        const isActive = theme === t.value

        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              "p-1.5 rounded-md transition-all duration-150 relative group",
              isActive 
                ? "bg-card text-foreground shadow-sm border border-border" 
                : "text-muted-foreground hover:text-foreground"
            )}
            title={`Set theme to ${t.label}`}
            aria-label={`Set theme to ${t.label}`}
          >
            <Icon className="w-4 h-4" />
            <span className="sr-only">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
