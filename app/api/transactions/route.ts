import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'

// GET /api/transactions - List transactions
export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const bankStatementId = searchParams.get('bankStatementId')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    
    // Build where clause
    const where: any = {}
    
    if (bankStatementId) {
      where.bankStatementId = bankStatementId
    }
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    // If clientId provided, filter by client's bank statements
    if (clientId) {
      where.bankStatement = {
        clientId,
        client: {
          userId: session.user.id,
        },
      }
    } else {
      // Ensure we only return transactions for user's clients
      where.bankStatement = {
        client: {
          userId: session.user.id,
        },
      }
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        bankStatement: {
          select: {
            id: true,
            fileName: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })
    
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
