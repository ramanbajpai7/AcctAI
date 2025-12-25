// OCR Service for Invoice Scanning
// Uses Tesseract.js for optical character recognition

import Tesseract from 'tesseract.js'
import { validateGSTIN, calculateGST } from './gst-validation'

export interface InvoiceData {
  // Vendor/Supplier Details
  vendorName?: string
  vendorGstin?: string
  vendorAddress?: string
  
  // Invoice Details
  invoiceNumber?: string
  invoiceDate?: Date
  dueDate?: Date
  
  // Amounts
  subtotal?: number
  cgst?: number
  sgst?: number
  igst?: number
  totalAmount?: number
  
  // Line Items
  lineItems: {
    description: string
    quantity?: number
    rate?: number
    amount?: number
    gstRate?: number
  }[]
  
  // Metadata
  rawText: string
  confidence: number
  processingTime: number
}

export interface OCRResult {
  success: boolean
  data?: InvoiceData
  error?: string
}

// Regular expressions for extracting invoice data
const patterns = {
  gstin: /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/gi,
  invoiceNumber: /(?:invoice\s*(?:no\.?|number|#)|inv\s*(?:no\.?|#))\s*[:\s]?\s*([A-Z0-9\-\/]+)/i,
  invoiceDate: /(?:invoice\s*date|date\s*of\s*issue|dated?|dt\.?)\s*[:\s]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  dueDate: /(?:due\s*date|payment\s*due|pay\s*by)\s*[:\s]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
  amount: /(?:total|amount|grand\s*total|net\s*amount|payable)\s*[:\s]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/gi,
  subtotal: /(?:sub\s*total|taxable\s*amount|taxable\s*value)\s*[:\s]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  cgst: /cgst\s*[@\s]?\s*(?:\d+(?:\.\d+)?%?)?\s*[:\s]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  sgst: /sgst\s*[@\s]?\s*(?:\d+(?:\.\d+)?%?)?\s*[:\s]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  igst: /igst\s*[@\s]?\s*(?:\d+(?:\.\d+)?%?)?\s*[:\s]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  gstRate: /(?:gst|tax)\s*[@\s]?\s*(\d+(?:\.\d+)?)\s*%/gi,
}

// Parse amount string to number
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0
  const cleaned = amountStr.replace(/[,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// Parse date string to Date object
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  
  // Try different date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/,
    // DD/MM/YY or DD-MM-YY
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/,
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      let day = parseInt(match[1])
      let month = parseInt(match[2])
      let year = parseInt(match[3])
      
      // Handle 2-digit year
      if (year < 100) {
        year += year > 50 ? 1900 : 2000
      }
      
      // Swap if day > 12 (likely MM/DD format)
      if (day > 12 && month <= 12) {
        // Keep as is - DD/MM format is common in India
      } else if (month > 12) {
        // Swap - likely MM/DD format
        [day, month] = [month, day]
      }
      
      return new Date(year, month - 1, day)
    }
  }
  
  // Fallback to JS Date parsing
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

// Extract invoice data from OCR text
function extractInvoiceData(text: string): Partial<InvoiceData> {
  const data: Partial<InvoiceData> = {
    lineItems: [],
    rawText: text,
  }
  
  // Extract GSTIN(s)
  const gstinMatches = text.match(patterns.gstin)
  if (gstinMatches && gstinMatches.length > 0) {
    // First valid GSTIN is usually the vendor's
    for (const gstin of gstinMatches) {
      const validation = validateGSTIN(gstin)
      if (validation.isValid) {
        data.vendorGstin = gstin.toUpperCase()
        break
      }
    }
  }
  
  // Extract Invoice Number
  const invoiceMatch = text.match(patterns.invoiceNumber)
  if (invoiceMatch) {
    data.invoiceNumber = invoiceMatch[1].trim()
  }
  
  // Extract Invoice Date
  const dateMatch = text.match(patterns.invoiceDate)
  if (dateMatch) {
    data.invoiceDate = parseDate(dateMatch[1])
  }
  
  // Extract Due Date
  const dueDateMatch = text.match(patterns.dueDate)
  if (dueDateMatch) {
    data.dueDate = parseDate(dueDateMatch[1])
  }
  
  // Extract Subtotal
  const subtotalMatch = text.match(patterns.subtotal)
  if (subtotalMatch) {
    data.subtotal = parseAmount(subtotalMatch[1])
  }
  
  // Extract CGST
  const cgstMatch = text.match(patterns.cgst)
  if (cgstMatch) {
    data.cgst = parseAmount(cgstMatch[1])
  }
  
  // Extract SGST
  const sgstMatch = text.match(patterns.sgst)
  if (sgstMatch) {
    data.sgst = parseAmount(sgstMatch[1])
  }
  
  // Extract IGST
  const igstMatch = text.match(patterns.igst)
  if (igstMatch) {
    data.igst = parseAmount(igstMatch[1])
  }
  
  // Extract Total Amount (get the largest amount as total)
  const amountMatches = [...text.matchAll(patterns.amount)]
  if (amountMatches.length > 0) {
    const amounts = amountMatches.map(m => parseAmount(m[1])).filter(a => a > 0)
    if (amounts.length > 0) {
      data.totalAmount = Math.max(...amounts)
    }
  }
  
  // Try to extract vendor name from first few lines
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length > 0) {
    // First non-empty line that's not a number/date is often the vendor name
    for (const line of lines.slice(0, 5)) {
      const cleaned = line.trim()
      if (cleaned.length > 3 && 
          cleaned.length < 100 &&
          !/^\d/.test(cleaned) &&
          !/^(invoice|tax|gst|date|bill)/i.test(cleaned)) {
        data.vendorName = cleaned
        break
      }
    }
  }
  
  return data
}

// Preprocess image for optimal OCR
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  // Dynamic import sharp for image processing
  try {
    const sharp = (await import('sharp')).default
    
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()
    
    // Resize if image is too large (max 1500px on longest side for speed)
    const maxDimension = 1500
    let processedImage = image
    
    if (metadata.width && metadata.height) {
      const longestSide = Math.max(metadata.width, metadata.height)
      if (longestSide > maxDimension) {
        processedImage = image.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true,
        })
      }
    }
    
    // Convert to grayscale and normalize for better OCR
    return await processedImage
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer()
  } catch (error) {
    // If sharp fails, return original buffer
    console.log('Image preprocessing skipped (sharp not available)')
    return imageBuffer
  }
}

// Perform OCR on image
export async function scanInvoice(imageBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now()
  
  try {
    // Preprocess image for faster OCR
    const processedBuffer = await preprocessImage(imageBuffer)
    
    // Perform OCR with optimized settings
    const result = await Tesseract.recognize(
      processedBuffer,
      'eng',
      {
        // No logger for faster processing
      }
    )
    
    const processingTime = Date.now() - startTime
    const text = result.data.text
    const confidence = result.data.confidence
    
    if (!text || text.trim().length < 10) {
      return {
        success: false,
        error: 'Could not extract text from image. Please ensure the image is clear and readable.',
      }
    }
    
    // Extract structured data
    const extractedData = extractInvoiceData(text)
    
    const invoiceData: InvoiceData = {
      ...extractedData,
      lineItems: extractedData.lineItems || [],
      rawText: text,
      confidence,
      processingTime,
    }
    
    return {
      success: true,
      data: invoiceData,
    }
  } catch (error) {
    console.error('OCR Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    }
  }
}

// Validate extracted invoice data
export function validateExtractedInvoice(data: InvoiceData): {
  isValid: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []
  
  // Check required fields
  if (!data.invoiceNumber) {
    issues.push('Invoice number not detected')
    suggestions.push('Manually enter the invoice number')
  }
  
  if (!data.invoiceDate) {
    issues.push('Invoice date not detected')
    suggestions.push('Manually enter the invoice date')
  }
  
  if (!data.totalAmount || data.totalAmount === 0) {
    issues.push('Total amount not detected')
    suggestions.push('Manually enter the total amount')
  }
  
  // Validate GSTIN if present
  if (data.vendorGstin) {
    const gstValidation = validateGSTIN(data.vendorGstin)
    if (!gstValidation.isValid) {
      issues.push(`Invalid vendor GSTIN: ${gstValidation.errors.join(', ')}`)
    }
  } else {
    suggestions.push('Vendor GSTIN not detected - add manually for ITC claims')
  }
  
  // Validate GST calculation
  if (data.subtotal && data.totalAmount) {
    const gstAmount = (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0)
    const expectedTotal = data.subtotal + gstAmount
    
    if (Math.abs(expectedTotal - data.totalAmount) > 1) {
      issues.push(`Total mismatch: Subtotal (₹${data.subtotal}) + GST (₹${gstAmount}) = ₹${expectedTotal}, but total shows ₹${data.totalAmount}`)
    }
  }
  
  // Check for inter-state vs intra-state consistency
  if ((data.cgst || data.sgst) && data.igst) {
    issues.push('Both CGST/SGST and IGST detected - invoice should have only one type')
  }
  
  // Low confidence warning
  if (data.confidence < 70) {
    suggestions.push(`OCR confidence is low (${data.confidence.toFixed(0)}%) - please verify all extracted data`)
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  }
}
