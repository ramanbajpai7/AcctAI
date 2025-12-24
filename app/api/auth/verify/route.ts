import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST /api/auth/verify - Verify user credentials (used by NextAuth)
export async function POST(request: Request) {
  console.log('=== Auth Verify Start ===')
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
  console.log('Is Vercel:', !!process.env.VERCEL)
  
  try {
    const body = await request.json()
    const { email, password } = body
    
    console.log('Verifying credentials for:', email)
    
    if (!email || !password) {
      console.log('Missing email or password')
      return NextResponse.json({ error: 'Missing credentials' }, { status: 401 })
    }
    
    // Lookup user in database
    console.log('Looking up user in database...')
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    console.log('User found:', !!user)
    
    if (!user) {
      console.log('User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    // Verify password (in production, use bcrypt.compare)
    if (user.password === password) {
      console.log('Password verified successfully')
      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        firm: user.firm,
        role: user.role,
      })
    }
    
    console.log('Password mismatch')
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  } catch (error) {
    console.error('Auth verify error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Database error', 
      details: errorMessage,
      databaseUrl: !!process.env.DATABASE_URL 
    }, { status: 500 })
  }
}
