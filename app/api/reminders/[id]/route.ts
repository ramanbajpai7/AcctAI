import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { sendEmail, generateComplianceReminderEmail } from '@/lib/email'
import { differenceInDays } from 'date-fns'

// POST /api/reminders/[id]/send - Send reminder for a specific task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    // Get the task
    const task = await prisma.complianceTask.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        client: true,
        user: true,
      },
    })
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    const accountantEmail = task.user.email
    if (!accountantEmail) {
      return NextResponse.json({ error: 'No email configured' }, { status: 400 })
    }
    
    const today = new Date()
    const daysUntilDue = differenceInDays(new Date(task.dueDate), today)
    
    // Generate and send email
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
    
    const sent = await sendEmail({
      to: accountantEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })
    
    if (sent) {
      // Mark as reminded
      await prisma.complianceTask.update({
        where: { id },
        data: { reminderSent: true },
      })
      
      return NextResponse.json({
        success: true,
        message: `Reminder sent to ${accountantEmail}`,
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending reminder:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    )
  }
}

// DELETE /api/reminders/[id] - Reset reminder status for a task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    // Verify ownership and update
    const task = await prisma.complianceTask.findFirst({
      where: { id, userId: session.user.id },
    })
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    await prisma.complianceTask.update({
      where: { id },
      data: { reminderSent: false },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting reminder:', error)
    return NextResponse.json(
      { error: 'Failed to reset reminder' },
      { status: 500 }
    )
  }
}
