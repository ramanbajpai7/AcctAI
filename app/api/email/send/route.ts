import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sendEmail } from '@/lib/email'

// POST /api/email/send - Send an email
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { to, subject, body: emailBody } = body
    
    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }
    
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }
    
    if (!emailBody) {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 })
    }
    
    // Convert plain text to HTML (preserve line breaks)
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px; background: #f9fafb; border-radius: 8px;">
          ${emailBody.split('\n').map((line: string) => 
            line.trim() ? `<p style="margin: 8px 0; color: #374151;">${line}</p>` : '<br/>'
          ).join('')}
        </div>
        <div style="padding: 15px; border-top: 1px solid #e5e7eb; margin-top: 20px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Sent from AcctAI - Accountant Productivity Platform
          </p>
        </div>
      </div>
    `
    
    const success = await sendEmail({
      to,
      subject,
      html: htmlBody,
      text: emailBody,
    })
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `Email sent successfully to ${to}` 
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to send email. Please check SMTP configuration.' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
