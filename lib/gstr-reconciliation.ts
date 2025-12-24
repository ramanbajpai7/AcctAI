// GSTR Reconciliation Service
// Compares sales/purchase data with GSTR-1, GSTR-2A/2B for mismatch detection

export interface GSTREntry {
  invoiceNumber: string
  invoiceDate: Date
  supplierGstin?: string
  buyerGstin?: string
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  cess?: number
  totalValue: number
  placeOfSupply?: string
  reverseCharge?: boolean
}

export interface ReconciliationMismatch {
  type: 'missing_in_books' | 'missing_in_gstr' | 'amount_mismatch' | 'gstin_mismatch' | 'date_mismatch'
  invoiceNumber: string
  booksValue?: GSTREntry
  gstrValue?: GSTREntry
  difference?: {
    taxableValue?: number
    cgst?: number
    sgst?: number
    igst?: number
    total?: number
  }
  severity: 'low' | 'medium' | 'high'
  suggestion: string
}

export interface ReconciliationResult {
  period: string // e.g., "November 2024"
  gstrType: 'GSTR-1' | 'GSTR-2A' | 'GSTR-2B' | 'GSTR-3B'
  summary: {
    totalInBooks: number
    totalInGSTR: number
    matchedCount: number
    mismatchCount: number
    missingInBooks: number
    missingInGSTR: number
    taxDifference: number
  }
  mismatches: ReconciliationMismatch[]
  matched: { invoiceNumber: string; amount: number }[]
}

// Parse GSTR JSON data (format from GST portal)
export function parseGSTRData(jsonData: any, gstrType: string): GSTREntry[] {
  const entries: GSTREntry[] = []
  
  try {
    if (gstrType === 'GSTR-1') {
      // B2B Invoices
      const b2b = jsonData.b2b || []
      for (const receiver of b2b) {
        for (const inv of receiver.inv || []) {
          for (const item of inv.itms || []) {
            entries.push({
              invoiceNumber: inv.inum,
              invoiceDate: parseGSTDate(inv.idt),
              buyerGstin: receiver.ctin,
              taxableValue: item.itm_det?.txval || 0,
              cgst: item.itm_det?.camt || 0,
              sgst: item.itm_det?.samt || 0,
              igst: item.itm_det?.iamt || 0,
              cess: item.itm_det?.csamt || 0,
              totalValue: inv.val || 0,
              placeOfSupply: inv.pos,
              reverseCharge: inv.rchrg === 'Y',
            })
          }
        }
      }
      
      // B2C Large
      const b2cl = jsonData.b2cl || []
      for (const state of b2cl) {
        for (const inv of state.inv || []) {
          entries.push({
            invoiceNumber: inv.inum,
            invoiceDate: parseGSTDate(inv.idt),
            taxableValue: inv.txval || 0,
            cgst: 0,
            sgst: 0,
            igst: inv.iamt || 0,
            totalValue: inv.val || 0,
            placeOfSupply: state.pos,
          })
        }
      }
    }
    
    if (gstrType === 'GSTR-2A' || gstrType === 'GSTR-2B') {
      // B2B supplies received
      const b2b = jsonData.b2b || []
      for (const supplier of b2b) {
        for (const inv of supplier.inv || []) {
          for (const item of inv.itms || []) {
            entries.push({
              invoiceNumber: inv.inum,
              invoiceDate: parseGSTDate(inv.idt),
              supplierGstin: supplier.ctin,
              taxableValue: item.itm_det?.txval || 0,
              cgst: item.itm_det?.camt || 0,
              sgst: item.itm_det?.samt || 0,
              igst: item.itm_det?.iamt || 0,
              cess: item.itm_det?.csamt || 0,
              totalValue: inv.val || 0,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing GSTR data:', error)
  }
  
  return entries
}

// Parse GST date format (DD-MM-YYYY or DDMMYYYY)
function parseGSTDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  
  // Remove any separators
  const cleaned = dateStr.replace(/[-\/]/g, '')
  
  if (cleaned.length === 8) {
    const day = parseInt(cleaned.substring(0, 2))
    const month = parseInt(cleaned.substring(2, 4))
    const year = parseInt(cleaned.substring(4, 8))
    return new Date(year, month - 1, day)
  }
  
  return new Date(dateStr)
}

// Reconcile books data with GSTR data
export function reconcileGSTR(
  booksData: GSTREntry[],
  gstrData: GSTREntry[],
  gstrType: 'GSTR-1' | 'GSTR-2A' | 'GSTR-2B' | 'GSTR-3B',
  period: string,
  tolerance: number = 1 // Amount tolerance for matching
): ReconciliationResult {
  const mismatches: ReconciliationMismatch[] = []
  const matched: { invoiceNumber: string; amount: number }[] = []
  
  // Create maps for quick lookup
  const booksMap = new Map<string, GSTREntry>()
  const gstrMap = new Map<string, GSTREntry>()
  
  for (const entry of booksData) {
    booksMap.set(normalizeInvoiceNumber(entry.invoiceNumber), entry)
  }
  
  for (const entry of gstrData) {
    gstrMap.set(normalizeInvoiceNumber(entry.invoiceNumber), entry)
  }
  
  // Check each books entry against GSTR
  for (const [invNum, booksEntry] of booksMap) {
    const gstrEntry = gstrMap.get(invNum)
    
    if (!gstrEntry) {
      mismatches.push({
        type: 'missing_in_gstr',
        invoiceNumber: booksEntry.invoiceNumber,
        booksValue: booksEntry,
        severity: booksEntry.totalValue > 50000 ? 'high' : 'medium',
        suggestion: 'Invoice exists in books but not in GSTR. Ensure it was uploaded correctly.',
      })
    } else {
      // Check for amount mismatches
      const taxDiff = Math.abs(
        (booksEntry.cgst + booksEntry.sgst + booksEntry.igst) -
        (gstrEntry.cgst + gstrEntry.sgst + gstrEntry.igst)
      )
      
      const valueDiff = Math.abs(booksEntry.taxableValue - gstrEntry.taxableValue)
      
      if (taxDiff > tolerance || valueDiff > tolerance) {
        mismatches.push({
          type: 'amount_mismatch',
          invoiceNumber: booksEntry.invoiceNumber,
          booksValue: booksEntry,
          gstrValue: gstrEntry,
          difference: {
            taxableValue: booksEntry.taxableValue - gstrEntry.taxableValue,
            cgst: booksEntry.cgst - gstrEntry.cgst,
            sgst: booksEntry.sgst - gstrEntry.sgst,
            igst: booksEntry.igst - gstrEntry.igst,
            total: booksEntry.totalValue - gstrEntry.totalValue,
          },
          severity: taxDiff > 1000 ? 'high' : taxDiff > 100 ? 'medium' : 'low',
          suggestion: `Tax amount mismatch of ₹${taxDiff.toFixed(2)}. Verify invoice amounts.`,
        })
      } else {
        matched.push({
          invoiceNumber: booksEntry.invoiceNumber,
          amount: booksEntry.totalValue,
        })
      }
    }
  }
  
  // Check for entries in GSTR not in books
  for (const [invNum, gstrEntry] of gstrMap) {
    if (!booksMap.has(invNum)) {
      mismatches.push({
        type: 'missing_in_books',
        invoiceNumber: gstrEntry.invoiceNumber,
        gstrValue: gstrEntry,
        severity: gstrEntry.totalValue > 50000 ? 'high' : 'medium',
        suggestion: `Invoice in GSTR but not in books. ${gstrType === 'GSTR-2B' ? 'ITC may be available.' : 'Check if invoice was recorded.'}`,
      })
    }
  }
  
  // Calculate summary
  const totalInBooks = booksData.reduce((sum, e) => sum + e.totalValue, 0)
  const totalInGSTR = gstrData.reduce((sum, e) => sum + e.totalValue, 0)
  const taxInBooks = booksData.reduce((sum, e) => sum + e.cgst + e.sgst + e.igst, 0)
  const taxInGSTR = gstrData.reduce((sum, e) => sum + e.cgst + e.sgst + e.igst, 0)
  
  return {
    period,
    gstrType,
    summary: {
      totalInBooks,
      totalInGSTR,
      matchedCount: matched.length,
      mismatchCount: mismatches.filter(m => m.type === 'amount_mismatch').length,
      missingInBooks: mismatches.filter(m => m.type === 'missing_in_books').length,
      missingInGSTR: mismatches.filter(m => m.type === 'missing_in_gstr').length,
      taxDifference: taxInBooks - taxInGSTR,
    },
    mismatches: mismatches.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    }),
    matched,
  }
}

// Normalize invoice number for comparison
function normalizeInvoiceNumber(invNum: string): string {
  return invNum
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Remove special chars
    .replace(/^0+/, '') // Remove leading zeros
}

// Parse CSV/Excel books data for reconciliation
export function parseBooksSalesData(rows: any[]): GSTREntry[] {
  const entries: GSTREntry[] = []
  
  for (const row of rows) {
    try {
      const entry: GSTREntry = {
        invoiceNumber: String(row['Invoice Number'] || row['Invoice No'] || row['Inv No'] || ''),
        invoiceDate: new Date(row['Invoice Date'] || row['Date'] || row['Inv Date']),
        buyerGstin: row['GSTIN'] || row['Buyer GSTIN'] || row['Customer GSTIN'],
        taxableValue: parseFloat(row['Taxable Value'] || row['Taxable Amount'] || 0),
        cgst: parseFloat(row['CGST'] || row['CGST Amount'] || 0),
        sgst: parseFloat(row['SGST'] || row['SGST Amount'] || 0),
        igst: parseFloat(row['IGST'] || row['IGST Amount'] || 0),
        totalValue: parseFloat(row['Total'] || row['Invoice Value'] || row['Total Value'] || 0),
        placeOfSupply: row['Place of Supply'] || row['POS'],
      }
      
      if (entry.invoiceNumber) {
        entries.push(entry)
      }
    } catch (e) {
      // Skip invalid rows
    }
  }
  
  return entries
}
