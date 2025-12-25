import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sendEmail } from '@/lib/email'

// POST /api/email/test - Send a test email
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { to } = body
    
    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }
    
    const success = await sendEmail({
      to,
      subject: '✅ Test Email from AcctAI Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Email Test Successful! 🎉</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
            <p style="color: #374151;">This is a test email from your AcctAI Accountant Platform.</p>
            <p style="color: #374151;">If you're seeing this, your email configuration is working correctly!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Sent by: ${session.user.email}<br/>
              Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      `,
      text: 'Email Test Successful! This is a test email from your AcctAI Accountant Platform.',
    })
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Test email sent successfully!' })
    } else {
      return NextResponse.json({ error: 'Failed to send email. Check SMTP configuration.' }, { status: 500 })
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
