import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'

// GET /api/clients - List all clients for the authenticated user
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            complianceTasks: true,
            bankStatements: true,
          },
        },
      },
    })
    
    return NextResponse.json(clients)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

// POST /api/clients - Create a new client
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, gstin, pan, email, phone, address, financialYear } = body
    
    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }
    
    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name,
        gstin,
        pan,
        email,
        phone,
        address,
        financialYear,
      },
    })
    
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
