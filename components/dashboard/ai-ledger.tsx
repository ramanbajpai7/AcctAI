"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, X, Zap, Loader2, Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Transaction {
  id: string
  date: string
  description: string
  reference?: string | null
  amount: number
  type: "debit" | "credit"
  suggestedLedger?: string | null
  suggestedConfidence?: number | null
  approvedLedger?: string | null
  status: string
  bankStatement?: {
    id: string
    fileName: string
    client?: {
      id: string
      name: string
    } | null
  } | null
}

interface LedgerAccount {
  id: string
  name: string
  group: string
}

export function AILedgerSuggestions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([])
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending")
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
    fetchLedgerAccounts()
  }, [filter])

  async function fetchTransactions() {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filter !== "all") params.append("status", filter)
      
      const res = await fetch(`/api/transactions?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTransactions(data)
    } catch (error) {
      toast.error("Failed to load transactions")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchLedgerAccounts() {
    try {
      const res = await fetch("/api/ledger-accounts")
      if (res.ok) {
        const data = await res.json()
        setLedgerAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Failed to fetch ledger accounts")
    }
  }

  async function handleApprove(id: string, ledger?: string) {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedLedger: ledger || transactions.find(t => t.id === id)?.suggestedLedger,
          status: "approved",
        }),
      })
      
      if (!res.ok) throw new Error("Failed to approve")
      toast.success("Transaction approved")
      fetchTransactions()
    } catch (error) {
      toast.error("Failed to approve transaction")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      })
      
      if (!res.ok) throw new Error("Failed to reject")
      toast.success("Transaction rejected")
      fetchTransactions()
    } catch (error) {
      toast.error("Failed to reject transaction")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleGetSuggestion(id: string) {
    setProcessingId(id)
    try {
      const txn = transactions.find(t => t.id === id)
      if (!txn) return

      const res = await fetch("/api/ai/suggest-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: id,
          description: txn.description,
          amount: txn.amount,
          type: txn.type,
        }),
      })
      
      if (!res.ok) throw new Error("Failed to get suggestion")
      toast.success("AI suggestion updated")
      fetchTransactions()
    } catch (error) {
      toast.error("Failed to get AI suggestion")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleExportToTally() {
    const approvedIds = transactions.filter(t => t.status === "approved").map(t => t.id)
    
    if (approvedIds.length === 0) {
      toast.error("No approved transactions to export")
      return
    }

    setIsExporting(true)
    try {
      const res = await fetch("/api/tally/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionIds: approvedIds,
          markAsExported: true,
        }),
      })
      
      if (!res.ok) throw new Error("Export failed")
      
      const data = await res.json()
      
      // Download XML file
      const blob = new Blob([data.xml], { type: "application/xml" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tally-export-${format(new Date(), "yyyyMMdd-HHmmss")}.xml`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success(`Exported ${data.exportedCount} transactions to Tally`)
      fetchTransactions()
    } catch (error) {
      toast.error("Failed to export to Tally")
    } finally {
      setIsExporting(false)
    }
  }

  const pendingCount = transactions.filter(t => t.status === "pending").length
  const approvedCount = transactions.filter(t => t.status === "approved").length
  const avgConfidence = transactions.length > 0
    ? Math.round(transactions.reduce((a, t) => a + (t.suggestedConfidence || 0), 0) / transactions.length)
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Pending Review</p>
          <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Approved</p>
          <p className="text-3xl font-bold text-foreground">{approvedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Avg AI Confidence</p>
          <p className="text-3xl font-bold text-foreground">{avgConfidence}%</p>
        </Card>
        <Card className="p-4 flex items-center justify-center">
          <Button 
            onClick={handleExportToTally} 
            disabled={approvedCount === 0 || isExporting}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download size={18} />
                <span className="ml-2">Export to Tally</span>
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["pending", "approved", "all"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f as typeof filter)}
            className={f === filter ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Transactions list */}
      <div className="space-y-3">
        {transactions.map((txn) => (
          <Card
            key={txn.id}
            className={`p-4 ${
              txn.status === "approved"
                ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {txn.status === "approved" && <CheckCircle size={18} className="text-green-600" />}
                  {txn.status === "pending" && <Zap size={18} className="text-blue-600" />}
                  <p className="font-semibold text-foreground">{txn.description}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>{format(new Date(txn.date), "MMM d, yyyy")}</span>
                  <span className={`font-medium ${txn.type === "debit" ? "text-red-600" : "text-green-600"}`}>
                    {txn.type === "debit" ? "-" : "+"}₹{txn.amount.toLocaleString("en-IN")}
                  </span>
                  <span>{txn.bankStatement?.client?.name || "Unknown"}</span>
                </div>
                <div className="mt-3">
                  {txn.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={txn.suggestedLedger || ""}
                        onValueChange={(v) => handleApprove(txn.id, v)}
                        disabled={processingId === txn.id}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Select ledger account" />
                        </SelectTrigger>
                        <SelectContent>
                          {ledgerAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.name}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {txn.suggestedConfidence && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-full rounded-full"
                              style={{ width: `${txn.suggestedConfidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {txn.suggestedConfidence}%
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">
                      Ledger: <span className="font-semibold text-foreground">{txn.approvedLedger}</span>
                    </p>
                  )}
                </div>
              </div>

              {txn.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleGetSuggestion(txn.id)}
                    disabled={processingId === txn.id}
                    title="Get new AI suggestion"
                  >
                    <RefreshCw size={16} className={processingId === txn.id ? "animate-spin" : ""} />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(txn.id)}
                    disabled={processingId === txn.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingId === txn.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span className="ml-1">Approve</span>
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(txn.id)}
                    disabled={processingId === txn.id}
                  >
                    <X size={16} />
                    <span className="ml-1">Reject</span>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {transactions.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {filter === "pending" 
              ? "No pending transactions. Upload a bank statement to get started!"
              : "No transactions found"}
          </p>
        </Card>
      )}
    </div>
  )
}
