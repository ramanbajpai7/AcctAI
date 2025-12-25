"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Mail, 
  Send, 
  Loader2, 
  Copy, 
  Check,
  FileText,
  Calendar,
  DollarSign,
  Users,
  MessageSquare
} from "lucide-react"
import { toast } from "sonner"

interface Client {
  id: string
  name: string
  email?: string
}

interface TemplateType {
  type: string
  label: string
  description: string
}

const templateIcons: Record<string, any> = {
  gst_reminder: Calendar,
  itr_reminder: FileText,
  tds_reminder: DollarSign,
  document_request: FileText,
  fee_reminder: DollarSign,
  compliance_update: Check,
  meeting_request: Users,
  acknowledgment: Check,
  query_response: MessageSquare,
}

export function EmailComposer() {
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<TemplateType[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [customData, setCustomData] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<{ subject: string; body: string; to: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchClients()
    fetchTemplates()
  }, [])

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch { /* ignore */ }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/email/draft")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates)
      }
    } catch { /* ignore */ }
  }

  async function handleGenerate() {
    if (!selectedTemplate) {
      toast.error("Please select a template")
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch("/api/email/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: selectedTemplate,
          clientId: selectedClient || undefined,
          customData,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate")

      const data = await res.json()
      setDraft(data.draft)
      toast.success("Email draft generated!")
    } catch (error) {
      toast.error("Failed to generate email draft")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const [isSending, setIsSending] = useState(false)

  async function handleSendEmail() {
    if (!draft) return
    
    if (!draft.to) {
      toast.error("No recipient email address. Please select a client with email.")
      return
    }
    
    setIsSending(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Email sent to ${draft.to}!`)
      } else {
        toast.error(data.error || "Failed to send email")
      }
    } catch (error) {
      toast.error("Failed to send email. Check your connection.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Template Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail size={20} className="text-blue-600" />
          <h3 className="font-semibold text-foreground">Generate Email Draft</h3>
        </div>

        <div className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client (Optional)</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Select client for personalization" />
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

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Email Template</Label>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {templates.map((template) => {
                const Icon = templateIcons[template.type] || Mail
                return (
                  <button
                    key={template.type}
                    onClick={() => setSelectedTemplate(template.type)}
                    className={`p-3 rounded-lg border text-left transition-colors flex items-start gap-3 ${
                      selectedTemplate === template.type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-border hover:border-blue-300'
                    }`}
                  >
                    <Icon size={18} className={selectedTemplate === template.type ? 'text-blue-600' : 'text-muted-foreground'} />
                    <div>
                      <p className="font-medium text-sm">{template.label}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Data Fields */}
          {selectedTemplate && (
            <div className="space-y-3">
              <Label>Additional Details</Label>
              
              {(selectedTemplate === 'gst_reminder' || selectedTemplate === 'tds_reminder') && (
                <>
                  <Input
                    placeholder="Return Type (e.g., GSTR-3B)"
                    value={customData.returnType || ''}
                    onChange={(e) => setCustomData({ ...customData, returnType: e.target.value })}
                  />
                  <Input
                    placeholder="Period (e.g., November 2024)"
                    value={customData.period || ''}
                    onChange={(e) => setCustomData({ ...customData, period: e.target.value })}
                  />
                </>
              )}
              
              <Input
                placeholder="Due Date"
                type="date"
                value={customData.dueDate || ''}
                onChange={(e) => setCustomData({ ...customData, dueDate: e.target.value })}
              />
              
              {selectedTemplate === 'fee_reminder' && (
                <Input
                  placeholder="Amount (e.g., 15,000)"
                  value={customData.amount || ''}
                  onChange={(e) => setCustomData({ ...customData, amount: e.target.value })}
                />
              )}
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!selectedTemplate || isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FileText size={16} className="mr-2" />
                Generate Draft
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Draft Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Email Preview</h3>
          {draft && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopy(draft.body)}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span className="ml-1">Copy</span>
              </Button>
              <Button 
                size="sm"
                onClick={handleSendEmail}
                disabled={isSending || !draft.to}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span className="ml-1">{isSending ? 'Sending...' : 'Send'}</span>
              </Button>
            </div>
          )}
        </div>

        {draft ? (
          <div className="space-y-4">
            {draft.to && (
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <p className="text-sm font-medium">{draft.to}</p>
              </div>
            )}
            
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input 
                value={draft.subject} 
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="font-medium"
              />
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Body</Label>
              <Textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail size={48} className="mx-auto mb-4 opacity-30" />
              <p>Select a template and generate to see preview</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
