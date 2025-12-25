import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { addDays, isPast, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export interface Notification {
  id: string
  type: 'overdue' | 'upcoming' | 'activity'
  title: string
  message: string
  link?: string
  createdAt: Date
  isRead: boolean
}

// GET /api/notifications - Get notifications for the authenticated user
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7)
    
    const notifications: Notification[] = []
    
    // Get overdue tasks
    const overdueTasks = await prisma.complianceTask.findMany({
      where: {
        userId,
        status: { in: ['pending', 'in-progress'] },
        dueDate: { lt: now },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    })
    
    for (const task of overdueTasks) {
      notifications.push({
        id: `overdue-${task.id}`,
        type: 'overdue',
        title: 'Overdue Task',
        message: `${task.title} for ${task.client.name} is overdue`,
        link: '/dashboard/compliance',
        createdAt: task.dueDate,
        isRead: false,
      })
    }
    
    // Get upcoming tasks (due within 7 days)
    const upcomingTasks = await prisma.complianceTask.findMany({
      where: {
        userId,
        status: { in: ['pending', 'in-progress'] },
        dueDate: {
          gte: startOfDay(now),
          lte: endOfDay(sevenDaysFromNow),
        },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    })
    
    for (const task of upcomingTasks) {
      notifications.push({
        id: `upcoming-${task.id}`,
        type: 'upcoming',
        title: 'Upcoming Deadline',
        message: `${task.title} for ${task.client.name} is due soon`,
        link: '/dashboard/compliance',
        createdAt: task.dueDate,
        isRead: false,
      })
    }
    
    // Get recent activity (last 5 completed tasks)
    const recentCompleted = await prisma.complianceTask.findMany({
      where: {
        userId,
        status: 'completed',
        completedAt: { not: null },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
    })
    
    for (const task of recentCompleted) {
      notifications.push({
        id: `activity-${task.id}`,
        type: 'activity',
        title: 'Task Completed',
        message: `${task.title} for ${task.client.name} was completed`,
        link: '/dashboard/compliance',
        createdAt: task.completedAt || task.updatedAt,
        isRead: true,
      })
    }
    
    // Sort by date (most recent first for activity, most urgent first for tasks)
    const sortedNotifications = notifications.sort((a, b) => {
      // Overdue first, then upcoming, then activity
      const typeOrder = { overdue: 0, upcoming: 1, activity: 2 }
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type]
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    // Count unread (overdue + upcoming)
    const unreadCount = notifications.filter(n => !n.isRead).length
    
    return NextResponse.json({
      notifications: sortedNotifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
