import { NextResponse } from 'next/server'
import { 
  validateGSTIN, 
  validatePAN, 
  calculateGST, 
  reverseCalculateGST,
  validateInvoiceGST,
  getStateFromGSTIN,
} from '@/lib/gst-validation'

// POST /api/gst/validate - Validate GSTIN, PAN, or invoice
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body
    
    switch (type) {
      case 'gstin': {
        const result = validateGSTIN(data.gstin)
        return NextResponse.json(result)
      }
      
      case 'pan': {
        const result = validatePAN(data.pan)
        return NextResponse.json(result)
      }
      
      case 'calculate': {
        const { amount, rate, isInterState } = data
        const result = calculateGST(amount, rate, isInterState)
        return NextResponse.json(result)
      }
      
      case 'reverse-calculate': {
        const { totalAmount, rate, isInterState } = data
        const result = reverseCalculateGST(totalAmount, rate, isInterState)
        return NextResponse.json(result)
      }
      
      case 'validate-invoice': {
        const result = validateInvoiceGST(data)
        return NextResponse.json(result)
      }
      
      case 'get-state': {
        const state = getStateFromGSTIN(data.gstin)
        return NextResponse.json({ state })
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid validation type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('GST validation error:', error)
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    )
  }
}
