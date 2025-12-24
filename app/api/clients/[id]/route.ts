import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'

// GET /api/clients/[id] - Get a single client
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
    
    const client = await prisma.client.findFirst({
      where: { 
        id,
        userId: session.user.id,
      },
      include: {
        complianceTasks: {
          orderBy: { dueDate: 'asc' },
          take: 5,
        },
        bankStatements: {
          orderBy: { uploadedAt: 'desc' },
          take: 5,
        },
      },
    })
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    return NextResponse.json(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

// PUT /api/clients/[id] - Update a client
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
    const { name, gstin, pan, email, phone, address, financialYear } = body
    
    // Verify ownership
    const existing = await prisma.client.findFirst({
      where: { id, userId: session.user.id },
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        gstin,
        pan,
        email,
        phone,
        address,
        financialYear,
      },
    })
    
    return NextResponse.json(client)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

// DELETE /api/clients/[id] - Delete a client
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
    const existing = await prisma.client.findFirst({
      where: { id, userId: session.user.id },
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    await prisma.client.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
