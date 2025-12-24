"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, CheckCircle, Clock, AlertCircle, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Client {
  id: string
  name: string
}

interface BankStatement {
  id: string
  fileName: string
  fileSize: number
  bankName?: string | null
  status: string
  transactionCount: number
  uploadedAt: string
  client: {
    id: string
    name: string
  }
}

export function BankImportSection() {
  const [clients, setClients] = useState<Client[]>([])
  const [statements, setStatements] = useState<BankStatement[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchClients()
    fetchStatements()
  }, [])

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data)
        if (data.length > 0 && !selectedClient) {
          setSelectedClient(data[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch clients")
    }
  }

  async function fetchStatements() {
    try {
      setIsLoading(true)
      const res = await fetch("/api/bank-statements")
      if (res.ok) {
        const data = await res.json()
        setStatements(data)
      }
    } catch (error) {
      toast.error("Failed to load bank statements")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFileUpload(file: File) {
    if (!selectedClient) {
      toast.error("Please select a client first")
      return
    }

    const validTypes = [".csv", ".xls", ".xlsx"]
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!validTypes.includes(ext)) {
      toast.error("Please upload a CSV, XLS, or XLSX file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("clientId", selectedClient)

      const res = await fetch("/api/bank-statements", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await res.json()
      toast.success(`Imported ${data.transactions.length} transactions!`)
      fetchStatements()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = "" // Reset for re-upload
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Client selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Upload for client:</label>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a client" />
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

      {/* Upload area */}
      <Card
        className={`p-12 border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-border hover:border-blue-300 dark:hover:border-blue-700"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Processing...</h3>
              <p className="text-muted-foreground">Parsing transactions and getting AI suggestions</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Upload Bank Statement</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your CSV, XLS, or XLSX file here, or click to browse
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Upload size={18} />
                <span className="ml-2">Choose File</span>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Maximum file size: 10MB</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </Card>

      {/* Recent imports */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Imports</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : statements.length > 0 ? (
          <div className="space-y-3">
            {statements.map((stmt) => (
              <Card key={stmt.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{stmt.fileName}</h4>
                        {stmt.status === "completed" && <CheckCircle size={16} className="text-green-600" />}
                        {stmt.status === "processing" && <Clock size={16} className="text-yellow-600 animate-spin" />}
                        {stmt.status === "error" && <AlertCircle size={16} className="text-red-600" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stmt.client.name} • {stmt.transactionCount} transactions • {formatFileSize(stmt.fileSize)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(stmt.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/dashboard/ledger?statementId=${stmt.id}`}>Review</a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No bank statements uploaded yet</p>
          </Card>
        )}
      </div>
    </div>
  )
}
