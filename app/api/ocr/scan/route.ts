import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { scanInvoice, validateExtractedInvoice } from '@/lib/ocr'

// POST /api/ocr/scan - Scan invoice image with OCR
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' },
        { status: 400 }
      )
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }
    
    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Perform OCR
    const result = await scanInvoice(buffer)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'OCR processing failed' },
        { status: 422 }
      )
    }
    
    // Validate extracted data
    const validation = validateExtractedInvoice(result.data!)
    
    return NextResponse.json({
      success: true,
      data: result.data,
      validation,
      meta: {
        fileName: file.name,
        fileSize: file.size,
        processingTime: result.data?.processingTime,
        confidence: result.data?.confidence,
      },
    })
  } catch (error) {
    console.error('OCR API Error:', error)
    return NextResponse.json(
      { error: 'Failed to process invoice' },
      { status: 500 }
    )
  }
}
