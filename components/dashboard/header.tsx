"use client"

import type { Session } from "next-auth"
import { LogoutButton } from "@/components/auth/logout-button"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { NotificationDropdown } from "./notification-dropdown"

interface HeaderProps {
  user?: Session["user"]
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-800 border-b border-border px-6 py-4">
      <div className="flex items-center justify-between h-16">
        <div>
          <h2 className="text-xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]}!</h2>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        </div>

        <div className="flex items-center gap-4">
          <NotificationDropdown />
          <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400">
            <Settings size={20} />
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
