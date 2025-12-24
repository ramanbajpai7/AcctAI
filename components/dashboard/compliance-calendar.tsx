"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Clock, AlertCircle, Plus, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Client {
  id: string
  name: string
}

interface ComplianceTask {
  id: string
  title: string
  description?: string | null
  dueDate: string
  category: string
  priority: string
  status: string
  client: {
    id: string
    name: string
  }
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  low: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
}

const categoryLabels: Record<string, string> = {
  gst: "GST",
  "income-tax": "Income Tax",
  tds: "TDS",
  roc: "ROC",
  audit: "Audit",
  other: "Other",
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={18} className="text-yellow-600" />,
  "in-progress": <AlertCircle size={18} className="text-blue-600" />,
  completed: <CheckCircle size={18} className="text-green-600" />,
}

export function ComplianceCalendar() {
  const [tasks, setTasks] = useState<ComplianceTask[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    category: "gst",
    priority: "medium",
  })

  useEffect(() => {
    fetchTasks()
    fetchClients()
  }, [filter])

  async function fetchTasks() {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filter !== "all") params.append("status", filter)
      
      const res = await fetch(`/api/compliance?${params}`)
      if (!res.ok) throw new Error("Failed to fetch tasks")
      const data = await res.json()
      setTasks(data)
    } catch (error) {
      toast.error("Failed to load compliance tasks")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch (error) {
      console.error("Failed to fetch clients")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.clientId || !formData.title || !formData.dueDate) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) throw new Error("Failed to create task")
      
      toast.success("Compliance task created")
      setIsDialogOpen(false)
      resetForm()
      fetchTasks()
    } catch (error) {
      toast.error("Failed to create task")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/compliance/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!res.ok) throw new Error("Failed to update status")
      
      toast.success("Status updated")
      fetchTasks()
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this compliance task?")) return
    
    try {
      const res = await fetch(`/api/compliance/${taskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Task deleted")
      fetchTasks()
    } catch (error) {
      toast.error("Failed to delete task")
    }
  }

  function resetForm() {
    setFormData({
      clientId: "",
      title: "",
      description: "",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      category: "gst",
      priority: "medium",
    })
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and actions */}
      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="flex gap-2">
          {["all", "pending", "in-progress", "completed"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f as typeof filter)}
              className={f === filter ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {f === "in-progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus size={18} />
              <span className="ml-2">Add Task</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Compliance Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., GSTR-1 Filing"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Task"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const dueInfo = getDaysUntilDue(task.dueDate)
          return (
            <Card key={task.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
              task.status === "completed" ? "bg-green-50/50 dark:bg-green-900/10" : ""
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="pt-1">{statusIcons[task.status]}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{task.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{task.client.name}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${dueInfo.isOverdue ? "text-red-600" : "text-foreground"}`}>
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary" className={priorityColors[task.priority]}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                    <Badge variant="outline">{categoryLabels[task.category] || task.category}</Badge>
                    {task.status !== "completed" && (
                      <Select
                        value={task.status}
                        onValueChange={(v) => handleStatusChange(task.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <span className={`text-xs ${dueInfo.isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                    {dueInfo.text}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {tasks.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {filter !== "all" ? `No ${filter} tasks found` : "No compliance tasks yet. Add your first task!"}
          </p>
        </Card>
      )}
    </div>
  )
}
