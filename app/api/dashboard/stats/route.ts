import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // Get basic counts
    const [
      clientCount,
      pendingTasks,
      completedTasks,
      bankStatements,
      pendingTransactions,
      approvedTransactions,
    ] = await Promise.all([
      prisma.client.count({ where: { userId } }),
      prisma.complianceTask.count({ 
        where: { userId, status: { in: ['pending', 'in-progress'] } }
      }),
      prisma.complianceTask.count({ 
        where: { userId, status: 'completed' }
      }),
      prisma.bankStatement.count({
        where: { client: { userId } }
      }),
      prisma.transaction.count({
        where: { 
          bankStatement: { client: { userId } },
          status: 'pending'
        }
      }),
      prisma.transaction.count({
        where: { 
          bankStatement: { client: { userId } },
          status: 'approved'
        }
      }),
    ])
    
    // Get overdue tasks
    const overdueTasks = await prisma.complianceTask.count({
      where: {
        userId,
        status: { in: ['pending', 'in-progress'] },
        dueDate: { lt: new Date() },
      },
    })
    
    // Get client growth over last 6 months
    const clientGrowth = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const monthStart = startOfMonth(date)
      const monthEnd = endOfMonth(date)
      
      const count = await prisma.client.count({
        where: {
          userId,
          createdAt: { lte: monthEnd },
        },
      })
      
      clientGrowth.push({
        month: format(date, 'MMM'),
        clients: count,
      })
    }
    
    // Get compliance stats over last 6 months
    const complianceStats = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const monthStart = startOfMonth(date)
      const monthEnd = endOfMonth(date)
      
      const [completed, pending] = await Promise.all([
        prisma.complianceTask.count({
          where: {
            userId,
            status: 'completed',
            completedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.complianceTask.count({
          where: {
            userId,
            status: { in: ['pending', 'in-progress'] },
            dueDate: { gte: monthStart, lte: monthEnd },
          },
        }),
      ])
      
      complianceStats.push({
        month: format(date, 'MMM'),
        completed,
        pending,
      })
    }
    
    // Get recent activity
    const recentActivity = []
    
    // Recent bank imports
    const recentImports = await prisma.bankStatement.findMany({
      where: { client: { userId } },
      orderBy: { uploadedAt: 'desc' },
      take: 3,
      include: { client: { select: { name: true } } },
    })
    
    for (const imp of recentImports) {
      recentActivity.push({
        action: `Bank statement imported for ${imp.client.name}`,
        time: imp.uploadedAt,
        type: 'import',
      })
    }
    
    // Recent completed tasks
    const recentCompleted = await prisma.complianceTask.findMany({
      where: { userId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      take: 3,
      include: { client: { select: { name: true } } },
    })
    
    for (const task of recentCompleted) {
      recentActivity.push({
        action: `${task.title} completed for ${task.client.name}`,
        time: task.completedAt || task.updatedAt,
        type: 'completed',
      })
    }
    
    // Sort by time
    recentActivity.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    
    return NextResponse.json({
      stats: {
        activeClients: clientCount,
        bankImports: bankStatements,
        completedTasks: completedTasks,
        pendingTasks: pendingTasks,
        overdueTasks: overdueTasks,
        pendingTransactions,
        approvedTransactions,
      },
      clientGrowth,
      complianceStats,
      recentActivity: recentActivity.slice(0, 5).map(a => ({
        ...a,
        time: formatTimeAgo(new Date(a.time)),
      })),
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return format(date, 'MMM d, yyyy')
}
