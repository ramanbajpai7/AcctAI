"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, FileText, Calendar, Zap, Settings, Menu, X, Camera, MessageCircle, Bot, Mail, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Bank Import", href: "/dashboard/import", icon: FileText },
  { name: "Invoice Scanner", href: "/dashboard/scanner", icon: Camera },
  { name: "Compliance", href: "/dashboard/compliance", icon: Calendar },
  { name: "AI Ledger", href: "/dashboard/ledger", icon: Zap },
  { name: "Tax Assistant", href: "/dashboard/assistant", icon: Bot },
  { name: "Email Drafts", href: "/dashboard/emails", icon: Mail },
  { name: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageCircle },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-600 dark:text-slate-400"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? "w-64" : "w-20"
        } bg-white dark:bg-slate-800 border-r border-border transition-all duration-300 hidden lg:flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              AA
            </div>
            {isOpen && (
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white">AcctAI</h1>
                <p className="text-xs text-muted-foreground">Automation</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <Icon size={20} />
                  {isOpen && <span>{item.name}</span>}
                </button>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {isOpen && <p className="text-xs text-muted-foreground text-center">v1.0 MVP</p>}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-border z-40 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border mt-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              AA
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">AcctAI</h1>
              <p className="text-xs text-muted-foreground">Automation</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </button>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
