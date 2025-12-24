"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts"
import { Loader2, TrendingUp, Users, AlertTriangle, CheckCircle } from "lucide-react"

interface AnalyticsData {
  revenueData: { month: string; revenue: number; tasks: number }[]
  workloadData: { month: string; completed: number; total: number; efficiency: number }[]
  categoryDistribution: { category: string; count: number }[]
  topClients: { name: string; tasks: number; statements: number; activity: number }[]
  complianceHealth: {
    overdue: number
    dueThisWeek: number
    dueThisMonth: number
    onTrack: number
    total: number
  }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const categoryLabels: Record<string, string> = {
  'gst': 'GST',
  'income-tax': 'Income Tax',
  'tds': 'TDS',
  'roc': 'ROC',
  'audit': 'Audit',
  'other': 'Other',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/analytics")
      if (res.ok) {
        const analytics = await res.json()
        setData(analytics)
      }
    } catch (error) {
      console.error("Failed to fetch analytics")
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

  if (!data) {
    return <div>Failed to load analytics</div>
  }

  const totalRevenue = data.revenueData.reduce((sum, d) => sum + d.revenue, 0)
  const avgEfficiency = Math.round(
    data.workloadData.reduce((sum, d) => sum + d.efficiency, 0) / data.workloadData.length
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your practice performance and client metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">₹{(totalRevenue / 1000).toFixed(1)}K</p>
              <p className="text-xs text-muted-foreground">Est. Revenue (6mo)</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{data.topClients.length}</p>
              <p className="text-xs text-muted-foreground">Active Clients</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgEfficiency}%</p>
              <p className="text-xs text-muted-foreground">Avg Efficiency</p>
            </div>
          </div>
        </Card>
        
        <Card className={`p-4 ${data.complianceHealth.overdue > 0 ? 'border-red-200 dark:border-red-800' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${data.complianceHealth.overdue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              <AlertTriangle className={data.complianceHealth.overdue > 0 ? 'text-red-600' : 'text-green-600'} size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{data.complianceHealth.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `₹${v/1000}K`} />
              <Tooltip 
                formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Task Efficiency */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Task Completion Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
              <Line type="monotone" dataKey="total" stroke="#94a3b8" strokeWidth={2} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Distribution */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Task Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.categoryDistribution.map(c => ({
                  name: categoryLabels[c.category] || c.category,
                  value: c.count,
                }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.categoryDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Clients */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Top Clients by Activity</h3>
          <div className="space-y-4">
            {data.topClients.map((client, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.tasks} tasks • {client.statements} statements
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{client.activity}</p>
                  <p className="text-xs text-muted-foreground">activities</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
