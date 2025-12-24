import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { sendEmail, generateComplianceReminderEmail, shouldSendReminder } from '@/lib/email'

// POST /api/reminders/send - Send reminders for upcoming deadlines
// This can be called by a cron job or manually triggered
export async function POST(request: Request) {
  try {
    // Validate request - can be triggered by cron with secret or by authenticated user
    const { searchParams } = new URL(request.url)
    const cronSecret = searchParams.get('secret')
    
    // Check for cron secret or authenticated session
    if (cronSecret !== process.env.CRON_SECRET) {
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    // Get all pending tasks that need reminders
    const tasks = await prisma.complianceTask.findMany({
      where: {
        status: { in: ['pending', 'in-progress'] },
        reminderSent: false,
      },
      include: {
        client: true,
        user: true,
      },
    })
    
    const results = {
      checked: tasks.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as { taskId: string; status: string; message: string }[],
    }
    
    for (const task of tasks) {
      const { shouldSend, daysUntilDue } = shouldSendReminder(
        new Date(task.dueDate),
        task.reminderSent
      )
      
      if (!shouldSend) {
        results.skipped++
        continue
      }
      
      // Get accountant email
      const accountantEmail = task.user.email
      if (!accountantEmail) {
        results.skipped++
        results.details.push({
          taskId: task.id,
          status: 'skipped',
          message: 'No email address for user',
        })
        continue
      }
      
      // Generate email content
      const emailContent = generateComplianceReminderEmail({
        clientName: task.client.name,
        taskTitle: task.title,
        dueDate: new Date(task.dueDate),
        daysUntilDue,
        category: task.category,
        accountantName: task.user.name,
        dashboardUrl: process.env.NEXT_PUBLIC_APP_URL 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/compliance`
          : undefined,
      })
      
      // Send the email
      const sent = await sendEmail({
        to: accountantEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
      
      if (sent) {
        // Mark reminder as sent
        await prisma.complianceTask.update({
          where: { id: task.id },
          data: { reminderSent: true },
        })
        
        results.sent++
        results.details.push({
          taskId: task.id,
          status: 'sent',
          message: `Reminder sent to ${accountantEmail}`,
        })
      } else {
        results.failed++
        results.details.push({
          taskId: task.id,
          status: 'failed',
          message: 'Failed to send email',
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}

// GET /api/reminders/preview - Preview pending reminders
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get tasks for this user that might need reminders
    const tasks = await prisma.complianceTask.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['pending', 'in-progress'] },
      },
      include: {
        client: {
          select: { name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    })
    
    const preview = tasks.map(task => {
      const { shouldSend, daysUntilDue, reminderType } = shouldSendReminder(
        new Date(task.dueDate),
        task.reminderSent
      )
      
      return {
        id: task.id,
        title: task.title,
        clientName: task.client.name,
        dueDate: task.dueDate,
        daysUntilDue,
        reminderSent: task.reminderSent,
        willSendReminder: shouldSend,
        reminderType,
      }
    })
    
    const summary = {
      total: preview.length,
      pendingReminders: preview.filter(p => p.willSendReminder).length,
      alreadySent: preview.filter(p => p.reminderSent).length,
      overdue: preview.filter(p => p.daysUntilDue < 0).length,
    }
    
    return NextResponse.json({ preview, summary })
  } catch (error) {
    console.error('Error previewing reminders:', error)
    return NextResponse.json({ error: 'Failed to preview reminders' }, { status: 500 })
  }
}
