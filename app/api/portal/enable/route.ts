import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import crypto from 'crypto'

// Simple password hashing for demo (use bcrypt in production)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// POST /api/portal/enable - Enable portal access for a client
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { clientId, portalEmail, password } = body
    
    if (!clientId || !portalEmail || !password) {
      return NextResponse.json(
        { error: 'Client ID, email, and password are required' },
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
    
    // Check if email is already in use
    const existingEmail = await prisma.client.findFirst({
      where: { 
        portalEmail,
        id: { not: clientId },
      },
    })
    
    if (existingEmail) {
      return NextResponse.json(
        { error: 'This email is already in use for another portal account' },
        { status: 400 }
      )
    }
    
    // Enable portal access
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        portalEnabled: true,
        portalEmail,
        portalPassword: hashPassword(password),
      },
    })
    
    return NextResponse.json({
      success: true,
      message: `Portal access enabled for ${client.name}`,
      portalEmail,
    })
  } catch (error) {
    console.error('Error enabling portal:', error)
    return NextResponse.json(
      { error: 'Failed to enable portal access' },
      { status: 500 }
    )
  }
}

// DELETE /api/portal/enable - Disable portal access for a client
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }
    
    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: session.user.id },
    })
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    // Disable portal access
    await prisma.client.update({
      where: { id: clientId },
      data: {
        portalEnabled: false,
        portalPassword: null,
        portalToken: null,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disabling portal:', error)
    return NextResponse.json(
      { error: 'Failed to disable portal access' },
      { status: 500 }
    )
  }
}
