import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// POST /api/auth/verify - Verify user credentials (used by NextAuth)
export async function POST(request: Request) {
  console.log('=== Auth Verify Start ===')
  
  const connectionString = process.env.DATABASE_URL
  console.log('DATABASE_URL:', connectionString ? 'SET (' + connectionString.length + ' chars)' : 'NOT SET')
  console.log('Is Vercel:', !!process.env.VERCEL)
  
  if (!connectionString) {
    console.error('DATABASE_URL not set!')
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }
  
  try {
    const body = await request.json()
    const { email, password } = body
    
    console.log('Verifying credentials for:', email)
    
    if (!email || !password) {
      console.log('Missing email or password')
      return NextResponse.json({ error: 'Missing credentials' }, { status: 401 })
    }
    
    // Use direct neon() SQL query
    const sql = neon(connectionString)
    console.log('Executing SQL query...')
    
    const users = await sql`SELECT id, email, name, password, firm, role FROM "User" WHERE email = ${email}`
    
    console.log('Query result count:', users.length)
    
    if (users.length === 0) {
      console.log('User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    const user = users[0]
    
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
