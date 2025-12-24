import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/ledger-accounts - List all ledger accounts
export async function GET() {
  try {
    const accounts = await prisma.ledgerAccount.findMany({
      orderBy: [
        { group: 'asc' },
        { subGroup: 'asc' },
        { name: 'asc' },
      ],
    })
    
    // Group by category for easier UI display
    const grouped = accounts.reduce((acc, account) => {
      if (!acc[account.group]) {
        acc[account.group] = []
      }
      acc[account.group].push(account)
      return acc
    }, {} as Record<string, typeof accounts>)
    
    return NextResponse.json({ accounts, grouped })
  } catch (error) {
    console.error('Error fetching ledger accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
