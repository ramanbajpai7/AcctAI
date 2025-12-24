import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST /api/auth/verify - Verify user credentials (used by NextAuth)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    
    if (!email || !password) {
      return NextResponse.json(null, { status: 401 })
    }
    
    // Lookup user in database
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    // Verify password (in production, use bcrypt.compare)
    if (user && user.password === password) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        firm: user.firm,
        role: user.role,
      })
    }
    
    return NextResponse.json(null, { status: 401 })
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json(null, { status: 500 })
  }
}
