"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Users, FileText, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react"

interface DashboardStats {
  stats: {
    activeClients: number
    bankImports: number
    completedTasks: number
    pendingTasks: number
    overdueTasks: number
    pendingTransactions: number
    approvedTransactions: number
  }
  clientGrowth: { month: string; clients: number }[]
  complianceStats: { month: string; completed: number; pending: number }[]
  recentActivity: { action: string; time: string; type: string }[]
}

export function DashboardOverview() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch("/api/dashboard/stats")
      if (res.ok) {
        const stats = await res.json()
        setData(stats)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const stats = data?.stats || {
    activeClients: 0,
    bankImports: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
  }

  const statCards = [
    {
      label: "Active Clients",
      value: stats.activeClients.toString(),
      icon: Users,
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Bank Imports",
      value: stats.bankImports.toString(),
      icon: FileText,
      color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    },
    {
      label: "Compliance Done",
      value: stats.completedTasks.toString(),
      icon: CheckCircle,
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending Tasks",
      value: stats.pendingTasks.toString(),
      icon: stats.overdueTasks > 0 ? AlertCircle : Clock,
      color: stats.overdueTasks > 0 
        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      subtitle: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : undefined,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients Growth */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Client Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.clientGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="clients" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Compliance Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Compliance Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.complianceStats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                name="Completed"
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                stroke="var(--color-chart-2)" 
                strokeWidth={2} 
                name="Pending" 
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {(data?.recentActivity || []).length > 0 ? (
            data?.recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  {activity.type === 'import' && <FileText size={16} className="text-blue-500" />}
                  {activity.type === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                  <p className="text-sm text-foreground">{activity.action}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">{activity.time}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity. Start by adding clients and uploading bank statements!
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
