import { NextResponse } from 'next/server'

// WhatsApp webhook verification and message receiving
// This endpoint receives incoming messages and status updates from WhatsApp

// GET - Webhook verification (required by Meta)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'accountant_platform_verify'
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified')
    return new Response(challenge, { status: 200 })
  }
  
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST - Receive messages and status updates
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Log webhook data for debugging
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))
    
    // Process incoming messages
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    
    if (value?.messages) {
      for (const message of value.messages) {
        const from = message.from // Phone number
        const msgType = message.type
        const timestamp = message.timestamp
        
        // Handle different message types
        if (msgType === 'text') {
          const text = message.text?.body
          console.log(`📥 WhatsApp message from ${from}: ${text}`)
          
          // Here you could:
          // 1. Auto-reply with acknowledgment
          // 2. Create a support ticket
          // 3. Forward to accountant
          // 4. Process commands (e.g., "status" to get compliance status)
          
          // For now, log the message
          // In production, you'd store this in the database
        }
        
        if (msgType === 'document' || msgType === 'image') {
          console.log(`📎 WhatsApp ${msgType} received from ${from}`)
          // Could trigger document upload workflow
        }
      }
    }
    
    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        const messageId = status.id
        const statusType = status.status // sent, delivered, read, failed
        const recipientId = status.recipient_id
        
        console.log(`📊 Message ${messageId} to ${recipientId}: ${statusType}`)
        
        // Update message status in database
        // This helps track delivery and read receipts
      }
    }
    
    // Must return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    // Still return 200 to prevent retry storms
    return NextResponse.json({ status: 'error logged' })
  }
}
