import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { cookies } from 'next/headers'

// Simple password hashing (use bcrypt in production)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// POST /api/portal/auth - Client portal login
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    // Find client with portal access
    const client = await prisma.client.findFirst({
      where: {
        portalEmail: email,
        portalEnabled: true,
      },
      include: {
        user: {
          select: { name: true, firm: true },
        },
      },
    })
    
    if (!client) {
      return NextResponse.json(
        { error: 'Invalid credentials or portal access not enabled' },
        { status: 401 }
      )
    }
    
    // Verify password
    if (client.portalPassword !== hashPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Generate session token
    const token = generateToken()
    
    // Update last login and token
    await prisma.client.update({
      where: { id: client.id },
      data: {
        portalToken: token,
        lastPortalLogin: new Date(),
      },
    })
    
    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('portal_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    
    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.portalEmail,
        accountantFirm: client.user.firm || client.user.name,
      },
    })
  } catch (error) {
    console.error('Portal login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

// DELETE /api/portal/auth - Client portal logout
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('portal_token')?.value
    
    if (token) {
      // Clear token from database
      await prisma.client.updateMany({
        where: { portalToken: token },
        data: { portalToken: null },
      })
      
      // Clear cookie
      cookieStore.delete('portal_token')
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}

// GET /api/portal/auth - Check current portal session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('portal_token')?.value
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    const client = await prisma.client.findFirst({
      where: {
        portalToken: token,
        portalEnabled: true,
      },
      include: {
        user: {
          select: { name: true, firm: true },
        },
      },
    })
    
    if (!client) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    return NextResponse.json({
      authenticated: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.portalEmail,
        gstin: client.gstin,
        pan: client.pan,
        accountantFirm: client.user.firm || client.user.name,
      },
    })
  } catch (error) {
    console.error('Portal auth check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
