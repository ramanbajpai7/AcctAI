"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ redirectUrl: "/login" })}
      className="text-slate-600 dark:text-slate-400"
    >
      <LogOut size={18} />
      <span className="hidden sm:inline ml-2">Logout</span>
    </Button>
  )
}
