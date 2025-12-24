import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

// GET /api/analytics - Get comprehensive analytics data
export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '6')
    
    // Revenue tracking (from compliance tasks - estimated based on completed tasks)
    const revenueData = []
    const workloadData = []
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const monthStart = startOfMonth(date)
      const monthEnd = endOfMonth(date)
      
      const completedTasks = await prisma.complianceTask.findMany({
        where: {
          userId,
          status: 'completed',
          completedAt: { gte: monthStart, lte: monthEnd },
        },
        include: { client: { select: { name: true } } },
      })
      
      const totalTasks = await prisma.complianceTask.count({
        where: {
          userId,
          dueDate: { gte: monthStart, lte: monthEnd },
        },
      })
      
      // Estimate revenue based on task types
      const estimatedRevenue = completedTasks.reduce((sum, task) => {
        const rates: Record<string, number> = {
          'gst': 1500,
          'income-tax': 5000,
          'tds': 2000,
          'roc': 3000,
          'audit': 15000,
          'other': 1000,
        }
        return sum + (rates[task.category] || 1000)
      }, 0)
      
      revenueData.push({
        month: format(date, 'MMM yyyy'),
        revenue: estimatedRevenue,
        tasks: completedTasks.length,
      })
      
      workloadData.push({
        month: format(date, 'MMM'),
        completed: completedTasks.length,
        total: totalTasks,
        efficiency: totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0,
      })
    }
    
    // Client distribution by task category
    const categoryStats = await prisma.complianceTask.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
    })
    
    const categoryDistribution = categoryStats.map(c => ({
      category: c.category,
      count: c._count,
    }))
    
    // Top clients by activity
    const clientStats = await prisma.client.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            complianceTasks: true,
            bankStatements: true,
          },
        },
      },
      orderBy: {
        complianceTasks: { _count: 'desc' },
      },
      take: 5,
    })
    
    const topClients = clientStats.map(c => ({
      name: c.name,
      tasks: c._count.complianceTasks,
      statements: c._count.bankStatements,
      activity: c._count.complianceTasks + c._count.bankStatements,
    }))
    
    // Compliance health
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const [overdue, dueThisWeek, dueThisMonth, onTrack] = await Promise.all([
      prisma.complianceTask.count({
        where: { userId, status: { in: ['pending', 'in-progress'] }, dueDate: { lt: now } },
      }),
      prisma.complianceTask.count({
        where: {
          userId,
          status: { in: ['pending', 'in-progress'] },
          dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.complianceTask.count({
        where: {
          userId,
          status: { in: ['pending', 'in-progress'] },
          dueDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.complianceTask.count({
        where: { userId, status: 'completed' },
      }),
    ])
    
    // Transaction processing stats
    const transactionStats = await prisma.transaction.groupBy({
      by: ['status'],
      where: { bankStatement: { client: { userId } } },
      _count: true,
    })
    
    return NextResponse.json({
      revenueData,
      workloadData,
      categoryDistribution,
      topClients,
      complianceHealth: {
        overdue,
        dueThisWeek,
        dueThisMonth,
        onTrack,
        total: overdue + dueThisWeek + dueThisMonth + onTrack,
      },
      transactionStats: transactionStats.map(t => ({
        status: t.status,
        count: t._count,
      })),
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
