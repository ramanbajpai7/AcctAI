"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function PortalLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Login failed")
      }

      toast.success(`Welcome, ${data.client.name}!`)
      router.push("/portal")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to main login */}
        <Link href="/login" className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          Back to Accountant Login
        </Link>

        <Card className="p-8 bg-white/10 backdrop-blur-lg border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">CP</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Client Portal</h1>
            <p className="text-slate-300 mt-2">Access your tax documents and compliance status</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In to Portal"
              )}
            </Button>
          </form>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Portal access is provided by your accountant.
              <br />
              Contact them if you don&apos;t have credentials.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
