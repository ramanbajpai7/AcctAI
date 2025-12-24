import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { generateTallyXml, generateExportSummary } from '@/lib/tally-xml'

// POST /api/tally/export - Export approved transactions to Tally XML
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { transactionIds, bankLedger, markAsExported } = body
    
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'Please provide transaction IDs to export' },
        { status: 400 }
      )
    }
    
    // Fetch transactions with ownership verification
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        status: 'approved',
        bankStatement: {
          client: {
            userId: session.user.id,
          },
        },
      },
      include: {
        bankStatement: {
          select: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })
    
    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No approved transactions found for export' },
        { status: 404 }
      )
    }
    
    // Generate export summary
    const summary = generateExportSummary(transactions)
    
    // Generate Tally XML
    const xml = generateTallyXml(transactions, bankLedger || 'Bank Account')
    
    // Mark transactions as exported if requested
    if (markAsExported) {
      await prisma.transaction.updateMany({
        where: { id: { in: transactions.map(t => t.id) } },
        data: {
          status: 'exported',
          exportedAt: new Date(),
        },
      })
    }
    
    return NextResponse.json({
      success: true,
      xml,
      summary,
      exportedCount: transactions.length,
    })
  } catch (error) {
    console.error('Error exporting to Tally:', error)
    return NextResponse.json(
      { error: 'Failed to generate Tally export' },
      { status: 500 }
    )
  }
}

// GET /api/tally/export/preview - Preview export summary without generating XML
export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    const where: any = {
      status: 'approved',
      bankStatement: {
        client: {
          userId: session.user.id,
        },
      },
    }
    
    if (clientId) {
      where.bankStatement.clientId = clientId
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        bankStatement: {
          select: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })
    
    const summary = generateExportSummary(transactions)
    
    return NextResponse.json({
      transactionIds: transactions.map(t => t.id),
      summary,
    })
  } catch (error) {
    console.error('Error previewing export:', error)
    return NextResponse.json({ error: 'Failed to preview export' }, { status: 500 })
  }
}
