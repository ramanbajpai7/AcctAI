import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { 
  sendWhatsAppMessage, 
  isWhatsAppConfigured,
  createComplianceReminderMessage,
  createDocumentRequestMessage,
  createGSTFilingReminderMessage,
  formatPhoneNumber,
} from '@/lib/whatsapp'
import { format, differenceInDays } from 'date-fns'

// POST /api/whatsapp/send - Send WhatsApp message
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { type, clientId, customMessage, templateData } = body
    
    // Get client with phone number
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: session.user.id },
    })
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    if (!client.phone) {
      return NextResponse.json(
        { error: 'Client does not have a phone number' },
        { status: 400 }
      )
    }
    
    let message: string
    
    switch (type) {
      case 'compliance_reminder':
        if (!templateData?.taskId) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
        }
        
        const task = await prisma.complianceTask.findFirst({
          where: { id: templateData.taskId, clientId },
        })
        
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }
        
        message = createComplianceReminderMessage({
          clientName: client.name,
          taskTitle: task.title,
          dueDate: format(new Date(task.dueDate), 'MMM d, yyyy'),
          daysLeft: differenceInDays(new Date(task.dueDate), new Date()),
          accountantName: session.user.name || undefined,
        })
        break
        
      case 'document_request':
        message = createDocumentRequestMessage({
          clientName: client.name,
          documentType: templateData?.documentType || 'Required Documents',
          financialYear: client.financialYear || undefined,
          deadline: templateData?.deadline,
        })
        break
        
      case 'gst_reminder':
        message = createGSTFilingReminderMessage({
          clientName: client.name,
          returnType: templateData?.returnType || 'GSTR-3B',
          period: templateData?.period || format(new Date(), 'MMMM yyyy'),
          dueDate: templateData?.dueDate || 'As per schedule',
        })
        break
        
      case 'custom':
        if (!customMessage) {
          return NextResponse.json({ error: 'Message content required' }, { status: 400 })
        }
        message = customMessage
        break
        
      default:
        return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
    }
    
    // Send the message
    const result = await sendWhatsAppMessage({
      to: client.phone,
      type: 'text',
      text: message,
    })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        sentTo: formatPhoneNumber(client.phone),
        preview: message.substring(0, 100) + '...',
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 }
    )
  }
}

// GET /api/whatsapp/send - Check WhatsApp configuration status
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json({
      configured: isWhatsAppConfigured(),
      mode: isWhatsAppConfigured() ? 'production' : 'development',
      message: isWhatsAppConfigured() 
        ? 'WhatsApp Business API is configured'
        : 'Running in development mode - messages logged to console',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
