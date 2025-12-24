import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'

// GET /api/compliance - List compliance tasks
export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    
    const where: any = { userId: session.user.id }
    if (clientId) where.clientId = clientId
    if (status && status !== 'all') where.status = status
    if (category) where.category = category
    
    const tasks = await prisma.complianceTask.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    })
    
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching compliance tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST /api/compliance - Create a compliance task
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { clientId, title, description, dueDate, category, priority } = body
    
    if (!clientId || !title || !dueDate || !category) {
      return NextResponse.json(
        { error: 'Client, title, due date, and category are required' },
        { status: 400 }
      )
    }
    
    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: session.user.id },
    })
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    const task = await prisma.complianceTask.create({
      data: {
        userId: session.user.id,
        clientId,
        title,
        description,
        dueDate: new Date(dueDate),
        category,
        priority: priority || 'medium',
        status: 'pending',
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating compliance task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
