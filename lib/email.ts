import nodemailer from 'nodemailer'
import { format, differenceInDays } from 'date-fns'

// Email configuration - uses environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// For development without SMTP, use console logging
const isDevelopment = process.env.NODE_ENV !== 'production'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (isDevelopment && !process.env.SMTP_USER) {
    // Log email in development mode when no SMTP configured
    console.log('📧 Email (dev mode):')
    console.log(`   To: ${options.to}`)
    console.log(`   Subject: ${options.subject}`)
    console.log(`   Preview: ${options.text?.substring(0, 100)}...`)
    return true
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Accountant Platform <noreply@example.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

// Email Templates
export function generateComplianceReminderEmail(data: {
  clientName: string
  taskTitle: string
  dueDate: Date
  daysUntilDue: number
  category: string
  accountantName: string
  dashboardUrl?: string
}): { subject: string; html: string; text: string } {
  const { clientName, taskTitle, dueDate, daysUntilDue, category, accountantName, dashboardUrl } = data
  
  const formattedDate = format(dueDate, 'MMMM d, yyyy')
  const urgencyColor = daysUntilDue <= 1 ? '#dc2626' : daysUntilDue <= 3 ? '#f59e0b' : '#2563eb'
  const urgencyLabel = daysUntilDue <= 0 ? 'OVERDUE' : daysUntilDue === 1 ? 'Due Tomorrow' : `${daysUntilDue} days left`
  
  const subject = daysUntilDue <= 0 
    ? `🚨 OVERDUE: ${taskTitle} for ${clientName}`
    : daysUntilDue <= 1
    ? `⚠️ Due Tomorrow: ${taskTitle} for ${clientName}`
    : `📅 Reminder: ${taskTitle} for ${clientName} - Due ${formattedDate}`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px 32px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Compliance Reminder</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; color: #374151;">Hi ${accountantName},</p>
        
        <p style="margin: 0 0 24px; color: #374151;">This is a reminder about an upcoming compliance deadline:</p>
        
        <!-- Task Card -->
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${urgencyColor};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px;">${taskTitle}</h2>
              <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">Client: <strong style="color: #374151;">${clientName}</strong></p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Category: <strong style="color: #374151;">${category.toUpperCase()}</strong></p>
            </div>
            <div style="text-align: right;">
              <div style="background-color: ${urgencyColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                ${urgencyLabel}
              </div>
              <p style="margin: 8px 0 0; color: #374151; font-weight: 600;">${formattedDate}</p>
            </div>
          </div>
        </div>
        
        ${dashboardUrl ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View in Dashboard
          </a>
        </div>
        ` : ''}
        
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          Please ensure this compliance task is completed before the due date to avoid penalties.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
          Sent by Accountant Productivity Platform
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `
Compliance Reminder

Hi ${accountantName},

This is a reminder about an upcoming compliance deadline:

Task: ${taskTitle}
Client: ${clientName}
Category: ${category.toUpperCase()}
Due Date: ${formattedDate}
Status: ${urgencyLabel}

Please ensure this compliance task is completed before the due date to avoid penalties.

${dashboardUrl ? `View in Dashboard: ${dashboardUrl}` : ''}

---
Sent by Accountant Productivity Platform
`

  return { subject, html, text }
}

// Calculate which tasks need reminders
export function shouldSendReminder(dueDate: Date, reminderSent: boolean): {
  shouldSend: boolean
  daysUntilDue: number
  reminderType: 'urgent' | 'warning' | 'info' | null
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  
  const daysUntilDue = differenceInDays(due, today)
  
  // Don't send if already sent or completed
  if (reminderSent) {
    return { shouldSend: false, daysUntilDue, reminderType: null }
  }
  
  // Send reminders at 7, 3, and 1 day before, and when overdue
  if (daysUntilDue <= 0) {
    return { shouldSend: true, daysUntilDue, reminderType: 'urgent' }
  } else if (daysUntilDue === 1) {
    return { shouldSend: true, daysUntilDue, reminderType: 'urgent' }
  } else if (daysUntilDue === 3) {
    return { shouldSend: true, daysUntilDue, reminderType: 'warning' }
  } else if (daysUntilDue === 7) {
    return { shouldSend: true, daysUntilDue, reminderType: 'info' }
  }
  
  return { shouldSend: false, daysUntilDue, reminderType: null }
}
