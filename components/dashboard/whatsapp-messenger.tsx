"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  CheckCircle, 
  Phone,
  FileText,
  Calendar,
  MessageSquare,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

interface Client {
  id: string
  name: string
  phone?: string | null
}

interface ComplianceTask {
  id: string
  title: string
  dueDate: string
}

type MessageType = 'compliance_reminder' | 'document_request' | 'gst_reminder' | 'custom'

const messageTemplates: { type: MessageType; icon: any; label: string; description: string }[] = [
  { 
    type: 'compliance_reminder', 
    icon: Calendar, 
    label: 'Compliance Reminder', 
    description: 'Send reminder for upcoming deadline' 
  },
  { 
    type: 'document_request', 
    icon: FileText, 
    label: 'Document Request', 
    description: 'Request specific documents from client' 
  },
  { 
    type: 'gst_reminder', 
    icon: AlertCircle, 
    label: 'GST Filing Reminder', 
    description: 'Remind about GST return filing' 
  },
  { 
    type: 'custom', 
    icon: MessageSquare, 
    label: 'Custom Message', 
    description: 'Send a custom message' 
  },
]

export function WhatsAppMessenger() {
  const [clients, setClients] = useState<Client[]>([])
  const [tasks, setTasks] = useState<ComplianceTask[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [messageType, setMessageType] = useState<MessageType>("compliance_reminder")
  const [customMessage, setCustomMessage] = useState("")
  const [selectedTask, setSelectedTask] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [gstReturnType, setGstReturnType] = useState("GSTR-3B")
  const [isSending, setIsSending] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [sentMessages, setSentMessages] = useState<{ client: string; time: string; preview: string }[]>([])

  useEffect(() => {
    fetchClients()
    checkStatus()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchClientTasks()
    }
  }, [selectedClient])

  async function checkStatus() {
    try {
      const res = await fetch("/api/whatsapp/send")
      if (res.ok) {
        const data = await res.json()
        setIsConfigured(data.configured)
      }
    } catch {
      setIsConfigured(false)
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data.filter((c: Client) => c.phone))
      }
    } catch {
      toast.error("Failed to load clients")
    }
  }

  async function fetchClientTasks() {
    try {
      const res = await fetch(`/api/compliance?clientId=${selectedClient}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.filter((t: any) => t.status !== 'completed'))
      }
    } catch {
      console.error("Failed to load tasks")
    }
  }

  async function handleSend() {
    if (!selectedClient) {
      toast.error("Please select a client")
      return
    }

    if (messageType === 'custom' && !customMessage.trim()) {
      toast.error("Please enter a message")
      return
    }

    if (messageType === 'compliance_reminder' && !selectedTask) {
      toast.error("Please select a task")
      return
    }

    setIsSending(true)
    try {
      const payload: any = {
        type: messageType,
        clientId: selectedClient,
      }

      if (messageType === 'custom') {
        payload.customMessage = customMessage
      } else if (messageType === 'compliance_reminder') {
        payload.templateData = { taskId: selectedTask }
      } else if (messageType === 'document_request') {
        payload.templateData = { documentType }
      } else if (messageType === 'gst_reminder') {
        payload.templateData = { returnType: gstReturnType }
      }

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to send")
      }

      const client = clients.find(c => c.id === selectedClient)
      setSentMessages(prev => [{
        client: client?.name || 'Unknown',
        time: new Date().toLocaleTimeString(),
        preview: data.preview || 'Message sent',
      }, ...prev.slice(0, 4)])

      toast.success(`Message sent to ${client?.name}`)
      setCustomMessage("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send")
    } finally {
      setIsSending(false)
    }
  }

  const clientsWithPhone = clients.filter(c => c.phone)

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isConfigured === false && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <MessageCircle size={20} className="text-yellow-600" />
            <div>
              <p className="font-medium text-foreground">Development Mode</p>
              <p className="text-sm text-muted-foreground">
                WhatsApp API not configured. Messages will be logged to console.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Message */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle size={20} className="text-green-600" />
            <h3 className="font-semibold text-foreground">Send WhatsApp Message</h3>
          </div>

          <div className="space-y-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose client with phone number" />
                </SelectTrigger>
                <SelectContent>
                  {clientsWithPhone.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-muted-foreground" />
                        {client.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clientsWithPhone.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No clients with phone numbers. Add phone numbers in client settings.
                </p>
              )}
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <Label>Message Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {messageTemplates.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setMessageType(type)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      messageType === type
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-border hover:border-green-300'
                    }`}
                  >
                    <Icon size={16} className={messageType === type ? 'text-green-600' : 'text-muted-foreground'} />
                    <p className="text-sm font-medium mt-1">{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Fields */}
            {messageType === 'compliance_reminder' && selectedClient && (
              <div className="space-y-2">
                <Label>Select Task</Label>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose compliance task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {messageType === 'document_request' && (
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Input
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="e.g., Bank Statement, Invoices, etc."
                />
              </div>
            )}

            {messageType === 'gst_reminder' && (
              <div className="space-y-2">
                <Label>GST Return Type</Label>
                <Select value={gstReturnType} onValueChange={setGstReturnType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GSTR-1">GSTR-1</SelectItem>
                    <SelectItem value="GSTR-3B">GSTR-3B</SelectItem>
                    <SelectItem value="GSTR-9">GSTR-9 (Annual)</SelectItem>
                    <SelectItem value="GSTR-9C">GSTR-9C (Reconciliation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {messageType === 'custom' && (
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                />
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!selectedClient || isSending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Send WhatsApp Message
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Recent Messages */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle size={20} className="text-green-600" />
            <h3 className="font-semibold text-foreground">Recent Messages</h3>
          </div>

          {sentMessages.length > 0 ? (
            <div className="space-y-3">
              {sentMessages.map((msg, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm text-foreground">{msg.client}</p>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {msg.preview}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-30" />
              <p>No messages sent yet</p>
              <p className="text-sm">Send your first WhatsApp message</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
