import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { 
  parseGSTRData, 
  parseBooksSalesData, 
  reconcileGSTR,
  type GSTREntry 
} from '@/lib/gstr-reconciliation'
import Papa from 'papaparse'

// POST /api/gstr/reconcile - Reconcile books with GSTR data
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const booksFile = formData.get('booksFile') as File | null
    const gstrFile = formData.get('gstrFile') as File | null
    const gstrType = formData.get('gstrType') as string || 'GSTR-1'
    const period = formData.get('period') as string || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    
    if (!booksFile || !gstrFile) {
      return NextResponse.json(
        { error: 'Both books data file and GSTR file are required' },
        { status: 400 }
      )
    }
    
    // Parse books data (CSV)
    let booksData: GSTREntry[] = []
    const booksText = await booksFile.text()
    
    if (booksFile.name.endsWith('.csv')) {
      const parsed = Papa.parse(booksText, { header: true, skipEmptyLines: true })
      booksData = parseBooksSalesData(parsed.data)
    } else if (booksFile.name.endsWith('.json')) {
      const jsonData = JSON.parse(booksText)
      booksData = Array.isArray(jsonData) ? parseBooksSalesData(jsonData) : []
    }
    
    // Parse GSTR data (JSON from GST portal)
    let gstrData: GSTREntry[] = []
    const gstrText = await gstrFile.text()
    
    if (gstrFile.name.endsWith('.json')) {
      const jsonData = JSON.parse(gstrText)
      gstrData = parseGSTRData(jsonData, gstrType)
    } else if (gstrFile.name.endsWith('.csv')) {
      const parsed = Papa.parse(gstrText, { header: true, skipEmptyLines: true })
      gstrData = parseBooksSalesData(parsed.data)
    }
    
    if (booksData.length === 0 && gstrData.length === 0) {
      return NextResponse.json(
        { error: 'Could not parse data from uploaded files' },
        { status: 400 }
      )
    }
    
    // Perform reconciliation
    const result = reconcileGSTR(
      booksData,
      gstrData,
      gstrType as 'GSTR-1' | 'GSTR-2A' | 'GSTR-2B' | 'GSTR-3B',
      period
    )
    
    return NextResponse.json({
      success: true,
      ...result,
      meta: {
        booksCount: booksData.length,
        gstrCount: gstrData.length,
        gstrType,
        period,
      },
    })
  } catch (error) {
    console.error('GSTR reconciliation error:', error)
    return NextResponse.json(
      { error: 'Reconciliation failed. Please check file formats.' },
      { status: 500 }
    )
  }
}
