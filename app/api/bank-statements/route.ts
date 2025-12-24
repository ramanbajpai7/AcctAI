import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { parseCSV, parseExcel, detectFileType } from '@/lib/bank-parser'
import { suggestLedgerWithAI } from '@/lib/ollama'

// POST /api/bank-statements/upload - Upload and parse bank statement
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const clientId = formData.get('clientId') as string | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
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
    
    const fileType = detectFileType(file.name)
    if (fileType === 'unknown') {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV, XLS, or XLSX.' },
        { status: 400 }
      )
    }
    
    // Create bank statement record
    const bankStatement = await prisma.bankStatement.create({
      data: {
        clientId,
        fileName: file.name,
        fileSize: file.size,
        status: 'processing',
      },
    })
    
    try {
      // Parse the file
      let parseResult
      if (fileType === 'csv') {
        const content = await file.text()
        parseResult = parseCSV(content)
      } else {
        const buffer = await file.arrayBuffer()
        parseResult = parseExcel(buffer)
      }
      
      if (!parseResult.success) {
        await prisma.bankStatement.update({
          where: { id: bankStatement.id },
          data: {
            status: 'error',
            errorMessage: parseResult.error,
          },
        })
        return NextResponse.json({ error: parseResult.error }, { status: 400 })
      }
      
      // Create transactions with AI suggestions
      const transactions = []
      
      for (const txn of parseResult.transactions) {
        // Get AI suggestion for ledger
        const suggestions = await suggestLedgerWithAI(
          txn.description,
          txn.amount,
          txn.type
        )
        
        const topSuggestion = suggestions[0]
        
        const transaction = await prisma.transaction.create({
          data: {
            bankStatementId: bankStatement.id,
            date: txn.date,
            description: txn.description,
            reference: txn.reference,
            amount: txn.amount,
            type: txn.type,
            balance: txn.balance,
            suggestedLedger: topSuggestion?.ledger,
            suggestedConfidence: topSuggestion?.confidence,
            status: 'pending',
          },
        })
        
        transactions.push({
          ...transaction,
          suggestions,
        })
      }
      
      // Update bank statement status
      await prisma.bankStatement.update({
        where: { id: bankStatement.id },
        data: {
          status: 'completed',
          transactionCount: transactions.length,
          processedCount: transactions.length,
          startDate: parseResult.startDate,
          endDate: parseResult.endDate,
          bankName: parseResult.bankName,
          processedAt: new Date(),
        },
      })
      
      return NextResponse.json({
        bankStatement: {
          ...bankStatement,
          transactionCount: transactions.length,
          status: 'completed',
        },
        transactions,
      }, { status: 201 })
      
    } catch (parseError) {
      await prisma.bankStatement.update({
        where: { id: bankStatement.id },
        data: {
          status: 'error',
          errorMessage: parseError instanceof Error ? parseError.message : 'Processing failed',
        },
      })
      throw parseError
    }
    
  } catch (error) {
    console.error('Error uploading bank statement:', error)
    return NextResponse.json(
      { error: 'Failed to process bank statement' },
      { status: 500 }
    )
  }
}

// GET /api/bank-statements - List bank statements
export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    const where: any = {
      client: {
        userId: session.user.id,
      },
    }
    
    if (clientId) {
      where.clientId = clientId
    }
    
    const statements = await prisma.bankStatement.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true },
        },
        _count: {
          select: { transactions: true },
        },
      },
    })
    
    return NextResponse.json(statements)
  } catch (error) {
    console.error('Error fetching bank statements:', error)
    return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 })
  }
}
