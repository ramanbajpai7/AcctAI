import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateEmailDraft, getEmailTemplateTypes, type EmailTemplateType } from '@/lib/email-drafts'
import prisma from '@/lib/db'

// POST /api/email/draft - Generate email draft
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { templateType, clientId, customData } = body
    
    if (!templateType) {
      return NextResponse.json({ error: 'Template type is required' }, { status: 400 })
    }
    
    // Get client details if provided
    let clientName = customData?.clientName || 'Valued Client'
    let clientEmail = ''
    
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: session.user.id },
      })
      
      if (client) {
        clientName = client.name
        clientEmail = client.email || ''
      }
    }
    
    // Generate the draft
    const draft = generateEmailDraft(templateType as EmailTemplateType, {
      clientName,
      accountantName: session.user.name || 'Your Accountant',
      firmName: (session.user as any).firm || '',
      ...customData,
    })
    
    return NextResponse.json({
      success: true,
      draft: {
        ...draft,
        to: clientEmail,
      },
    })
  } catch (error) {
    console.error('Email draft error:', error)
    return NextResponse.json(
      { error: 'Failed to generate email draft' },
      { status: 500 }
    )
  }
}

// GET /api/email/draft - Get available template types
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const templates = getEmailTemplateTypes()
    
    return NextResponse.json({ templates })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 })
  }
}
