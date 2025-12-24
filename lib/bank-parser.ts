import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedTransaction {
  date: Date
  description: string
  reference?: string
  amount: number
  type: 'debit' | 'credit'
  balance?: number
}

export interface ParseResult {
  success: boolean
  transactions: ParsedTransaction[]
  bankName?: string
  accountNumber?: string
  startDate?: Date
  endDate?: Date
  error?: string
}

// Common column name mappings for Indian bank statements
const columnMappings = {
  date: ['date', 'transaction date', 'txn date', 'value date', 'posting date', 'trans date'],
  description: ['description', 'particulars', 'narration', 'remarks', 'transaction description', 'details'],
  reference: ['reference', 'ref no', 'chq no', 'cheque no', 'ref', 'txn id', 'transaction id'],
  debit: ['debit', 'withdrawal', 'dr', 'debit amount', 'withdrawals'],
  credit: ['credit', 'deposit', 'cr', 'credit amount', 'deposits'],
  amount: ['amount', 'transaction amount', 'txn amount'],
  balance: ['balance', 'closing balance', 'running balance', 'available balance'],
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
}

function findColumnIndex(headers: string[], mappings: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeColumnName(headers[i])
    if (mappings.some(m => normalized.includes(m) || m.includes(normalized))) {
      return i
    }
  }
  return -1
}

function parseDate(value: string | number): Date | null {
  if (!value) return null
  
  // Handle Excel serial date
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
  }
  
  const dateStr = String(value).trim()
  
  // Try various date formats common in Indian bank statements
  const formats = [
    // DD/MM/YYYY, DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // YYYY/MM/DD, YYYY-MM-DD
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
    // DD-MMM-YYYY (e.g., 15-Jan-2024)
    /^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{4})$/,
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      if (format === formats[0]) {
        // DD/MM/YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
      } else if (format === formats[1]) {
        // YYYY/MM/DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
      } else if (format === formats[2]) {
        // DD-MMM-YYYY
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        }
        const month = months[match[2].toLowerCase()]
        if (month !== undefined) {
          return new Date(parseInt(match[3]), month, parseInt(match[1]))
        }
      }
    }
  }
  
  // Fallback to JS Date parsing
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

function parseAmount(value: string | number): number {
  if (typeof value === 'number') return Math.abs(value)
  if (!value) return 0
  
  // Remove currency symbols, commas, and spaces
  const cleaned = String(value)
    .replace(/[₹$,\s]/g, '')
    .replace(/\(([0-9.]+)\)/, '-$1') // Handle (amount) as negative
    .trim()
  
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.abs(num)
}

export function parseCSV(content: string): ParseResult {
  try {
    const result = Papa.parse(content, {
      header: false,
      skipEmptyLines: true,
    })
    
    if (!result.data || result.data.length < 2) {
      return { success: false, transactions: [], error: 'No data found in CSV' }
    }
    
    const rows = result.data as string[][]
    
    // Find header row (first row with meaningful data)
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i]
      if (row.some(cell => columnMappings.date.some(d => normalizeColumnName(cell).includes(d)))) {
        headerRowIndex = i
        break
      }
    }
    
    const headers = rows[headerRowIndex]
    
    // Find column indices
    const dateCol = findColumnIndex(headers, columnMappings.date)
    const descCol = findColumnIndex(headers, columnMappings.description)
    const refCol = findColumnIndex(headers, columnMappings.reference)
    const debitCol = findColumnIndex(headers, columnMappings.debit)
    const creditCol = findColumnIndex(headers, columnMappings.credit)
    const amountCol = findColumnIndex(headers, columnMappings.amount)
    const balanceCol = findColumnIndex(headers, columnMappings.balance)
    
    if (dateCol === -1) {
      return { success: false, transactions: [], error: 'Could not find date column' }
    }
    
    if (descCol === -1) {
      return { success: false, transactions: [], error: 'Could not find description column' }
    }
    
    const transactions: ParsedTransaction[] = []
    
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.every(cell => !cell || !cell.trim())) continue
      
      const date = parseDate(row[dateCol])
      if (!date) continue
      
      const description = row[descCol]?.trim() || ''
      if (!description) continue
      
      let amount = 0
      let type: 'debit' | 'credit' = 'debit'
      
      if (debitCol !== -1 && creditCol !== -1) {
        const debit = parseAmount(row[debitCol])
        const credit = parseAmount(row[creditCol])
        
        if (debit > 0) {
          amount = debit
          type = 'debit'
        } else if (credit > 0) {
          amount = credit
          type = 'credit'
        }
      } else if (amountCol !== -1) {
        const rawAmount = row[amountCol]
        amount = parseAmount(rawAmount)
        // Negative usually means debit
        type = String(rawAmount).includes('-') ? 'debit' : 'credit'
      }
      
      if (amount === 0) continue
      
      transactions.push({
        date,
        description,
        reference: refCol !== -1 ? row[refCol]?.trim() : undefined,
        amount,
        type,
        balance: balanceCol !== -1 ? parseAmount(row[balanceCol]) : undefined,
      })
    }
    
    // Calculate date range
    const dates = transactions.map(t => t.date.getTime())
    const startDate = dates.length ? new Date(Math.min(...dates)) : undefined
    const endDate = dates.length ? new Date(Math.max(...dates)) : undefined
    
    return {
      success: true,
      transactions,
      startDate,
      endDate,
    }
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Failed to parse CSV',
    }
  }
}

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    
    // Use first sheet
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][]
    
    if (!data || data.length < 2) {
      return { success: false, transactions: [], error: 'No data found in Excel' }
    }
    
    // Find header row
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]
      if (row && row.some(cell => cell && columnMappings.date.some(d => 
        normalizeColumnName(String(cell)).includes(d)
      ))) {
        headerRowIndex = i
        break
      }
    }
    
    const headers = (data[headerRowIndex] || []).map(h => String(h || ''))
    
    // Find column indices
    const dateCol = findColumnIndex(headers, columnMappings.date)
    const descCol = findColumnIndex(headers, columnMappings.description)
    const refCol = findColumnIndex(headers, columnMappings.reference)
    const debitCol = findColumnIndex(headers, columnMappings.debit)
    const creditCol = findColumnIndex(headers, columnMappings.credit)
    const amountCol = findColumnIndex(headers, columnMappings.amount)
    const balanceCol = findColumnIndex(headers, columnMappings.balance)
    
    if (dateCol === -1) {
      return { success: false, transactions: [], error: 'Could not find date column' }
    }
    
    if (descCol === -1) {
      return { success: false, transactions: [], error: 'Could not find description column' }
    }
    
    const transactions: ParsedTransaction[] = []
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.every(cell => !cell)) continue
      
      const dateValue = row[dateCol]
      let date: Date | null = null
      
      if (dateValue instanceof Date) {
        date = dateValue
      } else {
        date = parseDate(dateValue as string | number)
      }
      
      if (!date) continue
      
      const description = String(row[descCol] || '').trim()
      if (!description) continue
      
      let amount = 0
      let type: 'debit' | 'credit' = 'debit'
      
      if (debitCol !== -1 && creditCol !== -1) {
        const debit = parseAmount(row[debitCol] as string | number)
        const credit = parseAmount(row[creditCol] as string | number)
        
        if (debit > 0) {
          amount = debit
          type = 'debit'
        } else if (credit > 0) {
          amount = credit
          type = 'credit'
        }
      } else if (amountCol !== -1) {
        const rawAmount = row[amountCol]
        amount = parseAmount(rawAmount as string | number)
        type = String(rawAmount).includes('-') ? 'debit' : 'credit'
      }
      
      if (amount === 0) continue
      
      transactions.push({
        date,
        description,
        reference: refCol !== -1 ? String(row[refCol] || '').trim() || undefined : undefined,
        amount,
        type,
        balance: balanceCol !== -1 ? parseAmount(row[balanceCol] as string | number) : undefined,
      })
    }
    
    // Calculate date range
    const dates = transactions.map(t => t.date.getTime())
    const startDate = dates.length ? new Date(Math.min(...dates)) : undefined
    const endDate = dates.length ? new Date(Math.max(...dates)) : undefined
    
    return {
      success: true,
      transactions,
      startDate,
      endDate,
    }
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Failed to parse Excel',
    }
  }
}

export function detectFileType(fileName: string): 'csv' | 'excel' | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'csv') return 'csv'
  if (ext === 'xls' || ext === 'xlsx') return 'excel'
  return 'unknown'
}
