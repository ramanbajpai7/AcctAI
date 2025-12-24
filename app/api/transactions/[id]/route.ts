import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'

// PUT /api/transactions/[id] - Update transaction (approve/reject ledger)
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
    const { approvedLedger, status } = body
    
    // Verify ownership through the chain: transaction -> bankStatement -> client -> user
    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        bankStatement: {
          client: {
            userId: session.user.id,
          },
        },
      },
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    
    const updateData: any = {}
    if (approvedLedger !== undefined) updateData.approvedLedger = approvedLedger
    if (status !== undefined) updateData.status = status
    
    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
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
    
    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}
