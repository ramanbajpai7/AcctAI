// GST Validation Utilities for Indian GST compliance
// Validates GSTIN format, calculates GST, and checks for common errors

export interface GSTValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  details?: {
    stateCode: string
    stateName: string
    panNumber: string
    entityType: string
    checkDigit: string
  }
}

// State codes for GSTIN validation
const stateCodes: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
}

// Entity type codes
const entityTypes: Record<string, string> = {
  'C': 'Company',
  'P': 'Firm/LLP',
  'H': 'HUF',
  'A': 'Association of Persons',
  'T': 'Trust',
  'B': 'Body of Individuals',
  'L': 'Local Authority',
  'J': 'Artificial Juridical Person',
  'G': 'Government',
  'K': 'Krishi Finance Corporation',
  'N': 'Non-resident Taxable Person',
  'F': 'Foreign Liquidator',
  'U': 'Govt. Underd. ID Num.',
  'O': 'Other',
}

// Validate GSTIN format (15 characters)
export function validateGSTIN(gstin: string): GSTValidationResult {
  const result: GSTValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  }
  
  if (!gstin) {
    result.isValid = false
    result.errors.push('GSTIN is required')
    return result
  }
  
  // Remove spaces and convert to uppercase
  gstin = gstin.replace(/\s/g, '').toUpperCase()
  
  // Check length
  if (gstin.length !== 15) {
    result.isValid = false
    result.errors.push('GSTIN must be exactly 15 characters')
    return result
  }
  
  // Regex pattern for GSTIN
  // Format: 2 digit state code + 10 char PAN + 1 char entity number + Z + check digit
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  
  if (!gstinRegex.test(gstin)) {
    result.isValid = false
    result.errors.push('Invalid GSTIN format')
    return result
  }
  
  // Extract and validate state code
  const stateCode = gstin.substring(0, 2)
  if (!stateCodes[stateCode]) {
    result.isValid = false
    result.errors.push(`Invalid state code: ${stateCode}`)
    return result
  }
  
  // Extract PAN
  const panNumber = gstin.substring(2, 12)
  
  // Validate PAN format within GSTIN
  const panTypeChar = gstin.charAt(5)
  if (!entityTypes[panTypeChar]) {
    result.warnings.push(`Unknown entity type: ${panTypeChar}`)
  }
  
  // Validate check digit (simplified - full Luhn algorithm would be more complex)
  const checkDigit = gstin.charAt(14)
  
  // Set details if valid
  result.details = {
    stateCode,
    stateName: stateCodes[stateCode],
    panNumber,
    entityType: entityTypes[panTypeChar] || 'Unknown',
    checkDigit,
  }
  
  return result
}

// Validate PAN format
export function validatePAN(pan: string): { isValid: boolean; error?: string } {
  if (!pan) {
    return { isValid: false, error: 'PAN is required' }
  }
  
  pan = pan.replace(/\s/g, '').toUpperCase()
  
  if (pan.length !== 10) {
    return { isValid: false, error: 'PAN must be exactly 10 characters' }
  }
  
  // PAN format: 5 letters + 4 digits + 1 letter
  // 4th character indicates entity type
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  
  if (!panRegex.test(pan)) {
    return { isValid: false, error: 'Invalid PAN format' }
  }
  
  return { isValid: true }
}

// GST Rate Categories
export const gstRates = {
  exempt: { rate: 0, label: 'Exempt (0%)' },
  nil: { rate: 0, label: 'Nil Rated (0%)' },
  '5': { rate: 5, label: '5% GST' },
  '12': { rate: 12, label: '12% GST' },
  '18': { rate: 18, label: '18% GST' },
  '28': { rate: 28, label: '28% GST' },
}

// Calculate GST breakdown
export function calculateGST(amount: number, rate: number, isInterState: boolean): {
  baseAmount: number
  cgst: number
  sgst: number
  igst: number
  totalGst: number
  totalAmount: number
} {
  const gstAmount = (amount * rate) / 100
  
  if (isInterState) {
    // IGST for inter-state transactions
    return {
      baseAmount: amount,
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      totalGst: gstAmount,
      totalAmount: amount + gstAmount,
    }
  } else {
    // CGST + SGST for intra-state transactions (split 50-50)
    const halfGst = gstAmount / 2
    return {
      baseAmount: amount,
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
      totalGst: gstAmount,
      totalAmount: amount + gstAmount,
    }
  }
}

// Reverse calculate base amount from total (inclusive of GST)
export function reverseCalculateGST(totalAmount: number, rate: number, isInterState: boolean): {
  baseAmount: number
  cgst: number
  sgst: number
  igst: number
  totalGst: number
} {
  const baseAmount = (totalAmount * 100) / (100 + rate)
  const gstAmount = totalAmount - baseAmount
  
  if (isInterState) {
    return {
      baseAmount,
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      totalGst: gstAmount,
    }
  } else {
    const halfGst = gstAmount / 2
    return {
      baseAmount,
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
      totalGst: gstAmount,
    }
  }
}

// Determine if transaction is inter-state or intra-state
export function isInterStateTransaction(
  supplierStateCode: string,
  recipientStateCode: string
): boolean {
  return supplierStateCode !== recipientStateCode
}

// Validate invoice GST calculations
export interface InvoiceValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  calculations?: {
    expectedCgst: number
    expectedSgst: number
    expectedIgst: number
    expectedTotal: number
  }
}

export function validateInvoiceGST(invoice: {
  baseAmount: number
  gstRate: number
  cgst?: number
  sgst?: number
  igst?: number
  totalAmount: number
  supplierGstin: string
  recipientGstin?: string
}): InvoiceValidationResult {
  const result: InvoiceValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  }
  
  // Validate supplier GSTIN
  const supplierValidation = validateGSTIN(invoice.supplierGstin)
  if (!supplierValidation.isValid) {
    result.errors.push(`Invalid supplier GSTIN: ${supplierValidation.errors.join(', ')}`)
  }
  
  // Determine transaction type
  let isInterState = false
  if (invoice.recipientGstin) {
    const recipientValidation = validateGSTIN(invoice.recipientGstin)
    if (!recipientValidation.isValid) {
      result.warnings.push(`Invalid recipient GSTIN: ${recipientValidation.errors.join(', ')}`)
    } else if (supplierValidation.details && recipientValidation.details) {
      isInterState = isInterStateTransaction(
        supplierValidation.details.stateCode,
        recipientValidation.details.stateCode
      )
    }
  }
  
  // Calculate expected GST
  const expected = calculateGST(invoice.baseAmount, invoice.gstRate, isInterState)
  result.calculations = {
    expectedCgst: expected.cgst,
    expectedSgst: expected.sgst,
    expectedIgst: expected.igst,
    expectedTotal: expected.totalAmount,
  }
  
  // Validate amounts (with small tolerance for rounding)
  const tolerance = 1 // ₹1 tolerance
  
  if (isInterState) {
    // Should have IGST only
    if (invoice.cgst && invoice.cgst > tolerance) {
      result.errors.push('CGST should be 0 for inter-state transactions')
      result.isValid = false
    }
    if (invoice.sgst && invoice.sgst > tolerance) {
      result.errors.push('SGST should be 0 for inter-state transactions')
      result.isValid = false
    }
    if (invoice.igst !== undefined && Math.abs(invoice.igst - expected.igst) > tolerance) {
      result.errors.push(`IGST mismatch: Expected ₹${expected.igst.toFixed(2)}, got ₹${invoice.igst.toFixed(2)}`)
      result.isValid = false
    }
  } else {
    // Should have CGST + SGST only
    if (invoice.igst && invoice.igst > tolerance) {
      result.errors.push('IGST should be 0 for intra-state transactions')
      result.isValid = false
    }
    if (invoice.cgst !== undefined && Math.abs(invoice.cgst - expected.cgst) > tolerance) {
      result.errors.push(`CGST mismatch: Expected ₹${expected.cgst.toFixed(2)}, got ₹${invoice.cgst.toFixed(2)}`)
      result.isValid = false
    }
    if (invoice.sgst !== undefined && Math.abs(invoice.sgst - expected.sgst) > tolerance) {
      result.errors.push(`SGST mismatch: Expected ₹${expected.sgst.toFixed(2)}, got ₹${invoice.sgst.toFixed(2)}`)
      result.isValid = false
    }
  }
  
  // Validate total
  if (Math.abs(invoice.totalAmount - expected.totalAmount) > tolerance) {
    result.errors.push(`Total mismatch: Expected ₹${expected.totalAmount.toFixed(2)}, got ₹${invoice.totalAmount.toFixed(2)}`)
    result.isValid = false
  }
  
  return result
}

// Get state name from GSTIN
export function getStateFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null
  const stateCode = gstin.substring(0, 2)
  return stateCodes[stateCode] || null
}
