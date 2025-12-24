// WhatsApp Business API Integration
// Supports Meta's WhatsApp Business API with development mode fallback

export interface WhatsAppMessage {
  to: string // Phone number with country code (e.g., 919876543210)
  type: 'text' | 'template'
  text?: string
  template?: {
    name: string
    language: string
    components?: {
      type: 'body' | 'header'
      parameters: { type: 'text'; text: string }[]
    }[]
  }
}

interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

// Configuration from environment
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0'
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'

// Check if WhatsApp is configured
export function isWhatsAppConfigured(): boolean {
  return !!(WHATSAPP_PHONE_ID && WHATSAPP_ACCESS_TOKEN)
}

// Format phone number for WhatsApp (ensure country code, remove + and spaces)
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // If starts with 0, assume India and replace with 91
  if (cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1)
  }
  
  // If 10 digits (no country code), assume India
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned
  }
  
  return cleaned
}

// Send WhatsApp message via Business API
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
  const formattedPhone = formatPhoneNumber(message.to)
  
  // Development mode - log instead of sending
  if (!isWhatsAppConfigured()) {
    console.log('📱 WhatsApp Message (dev mode):')
    console.log(`   To: ${formattedPhone}`)
    console.log(`   Type: ${message.type}`)
    if (message.text) console.log(`   Text: ${message.text}`)
    if (message.template) console.log(`   Template: ${message.template.name}`)
    
    return {
      success: true,
      messageId: `dev_${Date.now()}`,
    }
  }
  
  try {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
    }
    
    if (message.type === 'text' && message.text) {
      payload.type = 'text'
      payload.text = { body: message.text }
    } else if (message.type === 'template' && message.template) {
      payload.type = 'template'
      payload.template = message.template
    }
    
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )
    
    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to send message',
      }
    }
    
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    console.error('WhatsApp API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Pre-built message templates for accountants

export function createComplianceReminderMessage(data: {
  clientName: string
  taskTitle: string
  dueDate: string
  daysLeft: number
  accountantName?: string
}): string {
  const urgency = data.daysLeft <= 0 
    ? '🚨 OVERDUE' 
    : data.daysLeft <= 1 
    ? '⚠️ Due Tomorrow' 
    : `📅 ${data.daysLeft} days left`
  
  return `${urgency}

*Compliance Reminder*
Task: ${data.taskTitle}
Client: ${data.clientName}
Due: ${data.dueDate}

${data.accountantName ? `From: ${data.accountantName}` : ''}
Please ensure timely completion.`
}

export function createDocumentRequestMessage(data: {
  clientName: string
  documentType: string
  financialYear?: string
  deadline?: string
}): string {
  return `📄 *Document Request*

Dear ${data.clientName},

We require the following document:
*${data.documentType}*
${data.financialYear ? `Financial Year: ${data.financialYear}` : ''}
${data.deadline ? `Please submit by: ${data.deadline}` : ''}

You can upload documents via your Client Portal.

Thank you for your cooperation.`
}

export function createGSTFilingReminderMessage(data: {
  clientName: string
  returnType: string // GSTR-1, GSTR-3B, etc.
  period: string // e.g., "November 2024"
  dueDate: string
}): string {
  return `🧾 *GST Filing Reminder*

Dear ${data.clientName},

*${data.returnType}* for *${data.period}* is due.

📅 Due Date: ${data.dueDate}

Please ensure all invoices are uploaded and data is verified.

Ignore if already filed.`
}

export function createPaymentReminderMessage(data: {
  clientName: string
  invoiceNumber?: string
  amount: string
  dueDate: string
}): string {
  return `💰 *Payment Reminder*

Dear ${data.clientName},

${data.invoiceNumber ? `Invoice: ${data.invoiceNumber}\n` : ''}Amount Due: ₹${data.amount}
Due Date: ${data.dueDate}

Please ensure timely payment to avoid any service interruption.

Thank you.`
}

// Batch send messages to multiple recipients
export async function sendBulkWhatsAppMessages(
  messages: { phone: string; message: string }[]
): Promise<{ sent: number; failed: number; results: WhatsAppResponse[] }> {
  const results: WhatsAppResponse[] = []
  let sent = 0
  let failed = 0
  
  for (const msg of messages) {
    const result = await sendWhatsAppMessage({
      to: msg.phone,
      type: 'text',
      text: msg.message,
    })
    
    results.push(result)
    if (result.success) sent++
    else failed++
    
    // Rate limiting - WhatsApp has limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return { sent, failed, results }
}
