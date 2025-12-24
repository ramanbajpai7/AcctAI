import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

// Helper to get authenticated client
async function getAuthenticatedClient() {
  const cookieStore = await cookies()
  const token = cookieStore.get('portal_token')?.value
  
  if (!token) return null
  
  return prisma.client.findFirst({
    where: { portalToken: token, portalEnabled: true },
  })
}

// GET /api/portal/dashboard - Get client dashboard data
export async function GET() {
  try {
    const client = await getAuthenticatedClient()
    
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get compliance tasks
    const tasks = await prisma.complianceTask.findMany({
      where: { clientId: client.id },
      orderBy: { dueDate: 'asc' },
    })
    
    // Get documents
    const documents = await prisma.document.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    
    // Get bank statements
    const statements = await prisma.bankStatement.findMany({
      where: { clientId: client.id },
      orderBy: { uploadedAt: 'desc' },
      take: 5,
    })
    
    // Calculate stats
    const pendingTasks = tasks.filter(t => t.status !== 'completed')
    const overdueTasks = pendingTasks.filter(t => new Date(t.dueDate) < new Date())
    const completedTasks = tasks.filter(t => t.status === 'completed')
    
    // Get upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const upcomingDeadlines = tasks.filter(t => 
      t.status !== 'completed' && 
      new Date(t.dueDate) <= thirtyDaysFromNow
    )
    
    return NextResponse.json({
      client: {
        name: client.name,
        gstin: client.gstin,
        pan: client.pan,
        financialYear: client.financialYear,
      },
      stats: {
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        completedTasks: completedTasks.length,
        totalDocuments: documents.length,
        totalStatements: statements.length,
      },
      upcomingDeadlines: upcomingDeadlines.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        dueDate: t.dueDate,
        status: t.status,
      })),
      recentDocuments: documents.slice(0, 5).map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        createdAt: d.createdAt,
      })),
      recentStatements: statements.map(s => ({
        id: s.id,
        fileName: s.fileName,
        transactionCount: s.transactionCount,
        status: s.status,
        uploadedAt: s.uploadedAt,
      })),
    })
  } catch (error) {
    console.error('Portal dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard' },
      { status: 500 }
    )
  }
}
