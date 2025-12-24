"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Upload, 
  LogOut,
  Loader2,
  Building2
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface DashboardData {
  client: {
    name: string
    gstin?: string
    pan?: string
    financialYear?: string
  }
  stats: {
    pendingTasks: number
    overdueTasks: number
    completedTasks: number
    totalDocuments: number
    totalStatements: number
  }
  upcomingDeadlines: {
    id: string
    title: string
    category: string
    dueDate: string
    status: string
  }[]
  recentDocuments: {
    id: string
    name: string
    type: string
    status: string
    createdAt: string
  }[]
}

export default function PortalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/portal/dashboard")
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/portal/login")
          return
        }
        throw new Error("Failed to load dashboard")
      }
      
      const data = await res.json()
      setData(data)
    } catch (error) {
      toast.error("Failed to load dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/portal/auth", { method: "DELETE" })
      router.push("/portal/login")
    } catch (error) {
      toast.error("Logout failed")
    }
  }

  function getDaysUntilDue(dueDate: string): { text: string; isOverdue: boolean } {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true }
    if (diffDays === 0) return { text: "Due today", isOverdue: false }
    if (diffDays === 1) return { text: "Due tomorrow", isOverdue: false }
    return { text: `${diffDays} days left`, isOverdue: false }
  }

  const categoryLabels: Record<string, string> = {
    gst: "GST",
    "income-tax": "Income Tax",
    tds: "TDS",
    roc: "ROC",
    audit: "Audit",
    other: "Other",
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">CP</span>
              </div>
              <div>
                <h1 className="font-bold text-foreground">Client Portal</h1>
                <p className="text-xs text-muted-foreground">{data.client.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Welcome, {data.client.name}</h2>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            {data.client.gstin && <span>GSTIN: {data.client.gstin}</span>}
            {data.client.pan && <span>PAN: {data.client.pan}</span>}
            {data.client.financialYear && <span>FY: {data.client.financialYear}</span>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.stats.pendingTasks}</p>
                <p className="text-xs text-muted-foreground">Pending Tasks</p>
              </div>
            </div>
          </Card>
          
          {data.stats.overdueTasks > 0 && (
            <Card className="p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{data.stats.overdueTasks}</p>
                  <p className="text-xs text-red-600/80">Overdue!</p>
                </div>
              </div>
            </Card>
          )}
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.stats.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.stats.totalDocuments}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-green-600" />
              <h3 className="font-semibold text-foreground">Upcoming Deadlines</h3>
            </div>
            
            {data.upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingDeadlines.map((task) => {
                  const dueInfo = getDaysUntilDue(task.dueDate)
                  return (
                    <div 
                      key={task.id} 
                      className={`p-3 rounded-lg border ${
                        dueInfo.isOverdue 
                          ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground text-sm">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {categoryLabels[task.category] || task.category} • {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          dueInfo.isOverdue 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                        }`}>
                          {dueInfo.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming deadlines. All caught up! 🎉
              </p>
            )}
          </Card>

          {/* Recent Documents */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-green-600" />
                <h3 className="font-semibold text-foreground">Recent Documents</h3>
              </div>
              <Button size="sm" variant="outline">
                <Upload size={14} className="mr-1" />
                Upload
              </Button>
            </div>
            
            {data.recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {data.recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      doc.status === 'approved' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : doc.status === 'reviewed'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No documents uploaded yet
              </p>
            )}
          </Card>
        </div>

        {/* Contact Section */}
        <Card className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Building2 size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                Contact your accountant for any questions about your compliance tasks or documents.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
