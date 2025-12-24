import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'

// GET /api/compliance/[id] - Get a single task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    const task = await prisma.complianceTask.findFirst({
      where: { id, userId: session.user.id },
      include: {
        client: true,
      },
    })
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

// PUT /api/compliance/[id] - Update a task
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const body = await request.json()
    const { title, description, dueDate, category, priority, status } = body
    
    // Verify ownership
    const existing = await prisma.complianceTask.findFirst({
      where: { id, userId: session.user.id },
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (category !== undefined) updateData.category = category
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completedAt = new Date()
      }
    }
    
    const task = await prisma.complianceTask.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    })
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/compliance/[id] - Delete a task
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
    
    // Verify ownership
    const existing = await prisma.complianceTask.findFirst({
      where: { id, userId: session.user.id },
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    await prisma.complianceTask.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
