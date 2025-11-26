"use client"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatches by waiting for client mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
        style={{ width: 100 }}
        aria-hidden
      />
    )
  }

  const options = [
    { key: "system", Icon: Monitor, label: "System" },
    { key: "light", Icon: Sun, label: "Light" },
    { key: "dark", Icon: Moon, label: "Dark" },
  ] as const

  // Use theme directly (not resolvedTheme) to avoid jumps during transitions
  const activeKey = (theme as typeof options[number]["key"]) || "system"
  const index = Math.max(0, options.findIndex((option) => option.key === activeKey))

  return (
    <div
      className="mode-toggle relative inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700"
      role="tablist"
      aria-label="Theme"
      style={{ width: 100 }}
    >
      {/* Sliding indicator pill - Movement math: 32px = 28px button + 4px gap */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 left-1 h-7 w-7 rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 32}px)` }}
      />
      {options.map(({ key, Icon, label }) => {
        const selected = key === activeKey
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-label={`Theme: ${label}`}
            title={`Theme: ${label}`}
            className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            onClick={() => setTheme(key)}
          >
            <Icon className="size-[14px] shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

