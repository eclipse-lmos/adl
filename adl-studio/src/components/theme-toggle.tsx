"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1 opacity-50">
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-3" disabled>
          <Sun className="h-4 w-4" />
          <span className="text-xs">Light</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-3" disabled>
          <Moon className="h-4 w-4" />
          <span className="text-xs">Dark</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-3" disabled>
          <Monitor className="h-4 w-4" />
          <span className="text-xs">System</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "h-8 gap-2 px-3 transition-all",
          theme === "light" 
            ? "bg-background text-foreground shadow-sm hover:bg-background" 
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setTheme("light")}
      >
        <Sun className="h-4 w-4" />
        <span className="text-xs">Light</span>
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "h-8 gap-2 px-3 transition-all",
          theme === "dark" 
            ? "bg-background text-foreground shadow-sm hover:bg-background" 
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setTheme("dark")}
      >
        <Moon className="h-4 w-4" />
        <span className="text-xs">Dark</span>
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "h-8 gap-2 px-3 transition-all",
          theme === "system" 
            ? "bg-background text-foreground shadow-sm hover:bg-background" 
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setTheme("system")}
      >
        <Monitor className="h-4 w-4" />
        <span className="text-xs">System</span>
      </Button>
    </div>
  )
}
