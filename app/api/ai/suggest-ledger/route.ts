import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { suggestLedgerWithAI } from '@/lib/ollama'

// POST /api/ai/suggest-ledger - Get AI suggestions for a transaction
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { description, amount, type, transactionId } = body
    
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }
    
    // Get available ledger accounts
    const ledgerAccounts = await prisma.ledgerAccount.findMany({
      select: { name: true },
    })
    
    const availableLedgers = ledgerAccounts.map(a => a.name)
    
    // Get AI suggestions
    const suggestions = await suggestLedgerWithAI(
      description,
      amount || 0,
      type || 'debit',
      availableLedgers
    )
    
    // If transactionId provided, update the transaction with suggestion
    if (transactionId) {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          suggestedLedger: suggestions[0]?.ledger,
          suggestedConfidence: suggestions[0]?.confidence,
        },
      })
    }
    
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error getting AI suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}
