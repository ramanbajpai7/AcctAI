"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Bot, 
  Send, 
  Loader2, 
  User, 
  Sparkles,
  Calculator,
  Calendar,
  FileText,
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  relatedTopics?: string[]
}

const quickQuestions = [
  { icon: Calculator, text: "GST rates for services" },
  { icon: Calendar, text: "GSTR-3B due date" },
  { icon: FileText, text: "Section 80C deductions" },
  { icon: HelpCircle, text: "TDS on rent payment" },
]

export function TaxChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Hello! I'm your Tax Assistant.\n\nI can help you with:\n• **GST**: Rates, filing dates, ITC rules\n• **Income Tax**: Slabs, deductions, ITR filing\n• **TDS**: Rates, due dates, challans\n• **Calculations**: Tax on income\n\nAsk me anything!`,
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(query?: string) {
    const questionText = query || input.trim()
    if (!questionText) return

    const userMessage: Message = { role: 'user', content: questionText }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: questionText,
          conversationHistory: messages 
        }),
      })

      if (!res.ok) throw new Error("Failed to get response")

      const data = await res.json()
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        relatedTopics: data.relatedTopics,
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      toast.error("Failed to get answer. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      {/* Chat Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-md' 
                    : 'bg-slate-100 dark:bg-slate-800 text-foreground rounded-bl-md'
                }`}>
                  <div className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>') 
                    }}
                  />
                </div>
                
                {/* Sources & Related Topics */}
                {msg.role === 'assistant' && (msg.sources?.length || msg.relatedTopics?.length) && (
                  <div className="mt-2 space-y-1">
                    {msg.sources && msg.sources.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        📚 {msg.sources.join(', ')}
                      </p>
                    )}
                    {msg.relatedTopics && msg.relatedTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.relatedTopics.map((topic, j) => (
                          <button
                            key={j}
                            onClick={() => handleSend(topic)}
                            className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-slate-600 dark:text-slate-300" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Quick Questions */}
        {messages.length <= 2 && (
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, i) => {
                const Icon = q.icon
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(q.text)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                  >
                    <Icon size={14} className="text-blue-500" />
                    {q.text}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about GST, Income Tax, TDS..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send size={18} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            <Sparkles size={12} className="inline mr-1" />
            Try: "Calculate tax on 12 lakh income" or "What is the TDS rate on professional fees?"
          </p>
        </div>
      </Card>
    </div>
  )
}
