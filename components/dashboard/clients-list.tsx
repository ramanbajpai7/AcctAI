"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, MoreVertical, Loader2, Trash2, Edit } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface Client {
  id: string
  name: string
  gstin?: string | null
  pan?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  financialYear?: string | null
  createdAt: string
  _count?: {
    complianceTasks: number
    bankStatements: number
  }
}

export function ClientsList() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    address: "",
    financialYear: "2024-25",
  })
  const [isSaving, setIsSaving] = useState(false)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch clients when debounced query changes
  useEffect(() => {
    fetchClients(debouncedQuery)
  }, [debouncedQuery])

  // Initial fetch
  useEffect(() => {
    fetchClients("")
  }, [])

  async function fetchClients(query: string = "") {
    try {
      if (clients.length > 0) {
        setIsSearching(true)
      } else {
        setIsLoading(true)
      }
      const url = query ? `/api/clients?q=${encodeURIComponent(query)}` : "/api/clients"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch clients")
      const data = await res.json()
      setClients(data)
    } catch (error) {
      toast.error("Failed to load clients")
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Client name is required")
      return
    }

    setIsSaving(true)
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients"
      const method = editingClient ? "PUT" : "POST"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) throw new Error("Failed to save client")
      
      toast.success(editingClient ? "Client updated" : "Client created")
      setIsDialogOpen(false)
      setEditingClient(null)
      resetForm()
      fetchClients()
    } catch (error) {
      toast.error("Failed to save client")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Are you sure you want to delete ${client.name}?`)) return
    
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Client deleted")
      fetchClients()
    } catch (error) {
      toast.error("Failed to delete client")
    }
  }

  function handleEdit(client: Client) {
    setEditingClient(client)
    setFormData({
      name: client.name,
      gstin: client.gstin || "",
      pan: client.pan || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      financialYear: client.financialYear || "2024-25",
    })
    setIsDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      name: "",
      gstin: "",
      pan: "",
      email: "",
      phone: "",
      address: "",
      financialYear: "2024-25",
    })
    setEditingClient(null)
  }

  // Server-side search is used, no client-side filtering needed

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-3 text-muted-foreground animate-spin" size={18} />
          ) : (
            <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          )}
          <Input
            placeholder="Search by name, GSTIN, PAN, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus size={18} />
              <span className="ml-2">Add Client</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Acme Corporation"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AAFFU5055K1Z0"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="AAAFR5055K"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="financialYear">Financial Year</Label>
                <Input
                  id="financialYear"
                  value={formData.financialYear}
                  onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                  placeholder="2024-25"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingClient ? "Save Changes" : "Add Client"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients table */}
      {clients.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Client Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">GSTIN</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tasks</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Statements</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.pan || "—"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{client.gstin || "—"}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{client.email || "—"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {client._count?.complianceTasks || 0} tasks
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-green-50 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
                        {client._count?.bankStatements || 0} imports
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(client)}>
                          <Trash2 size={16} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? "No clients found matching your search" : "No clients yet. Add your first client!"}
          </p>
        </Card>
      )}
    </div>
  )
}
