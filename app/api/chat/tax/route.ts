import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { processTaxQuery, calculateIncomeTax, type ChatMessage } from '@/lib/tax-chatbot'

// POST /api/chat/tax - Process tax query
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { query, conversationHistory } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }
    
    // Check for calculation requests
    if (query.toLowerCase().includes('calculate') && query.toLowerCase().includes('tax')) {
      // Extract income amount from query
      const amountMatch = query.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|l)?/i)
      
      if (amountMatch) {
        let amount = parseFloat(amountMatch[1].replace(/,/g, ''))
        
        // Convert lakh to actual value
        if (query.toLowerCase().includes('lakh') || query.toLowerCase().includes('lac')) {
          amount *= 100000
        }
        
        const oldRegime = calculateIncomeTax(amount, 'old')
        const newRegime = calculateIncomeTax(amount, 'new')
        
        return NextResponse.json({
          answer: `**Income Tax Calculation for ₹${amount.toLocaleString('en-IN')}**\n\n` +
            `**New Tax Regime (Default):**\n` +
            `• Tax: ₹${newRegime.tax.toLocaleString('en-IN')}\n` +
            `• Cess (4%): ₹${newRegime.cess.toLocaleString('en-IN')}\n` +
            `• **Total: ₹${newRegime.totalTax.toLocaleString('en-IN')}**\n` +
            `• Effective Rate: ${newRegime.effectiveRate.toFixed(2)}%\n\n` +
            `**Old Tax Regime:**\n` +
            `• Tax: ₹${oldRegime.tax.toLocaleString('en-IN')}\n` +
            `• Cess (4%): ₹${oldRegime.cess.toLocaleString('en-IN')}\n` +
            `• **Total: ₹${oldRegime.totalTax.toLocaleString('en-IN')}**\n` +
            `• Effective Rate: ${oldRegime.effectiveRate.toFixed(2)}%\n\n` +
            `*Note: Old regime allows deductions under 80C, 80D, etc.*`,
          sources: ['Income Tax Act 1961', 'Finance Act 2024'],
          relatedTopics: ['Section 80C deductions', 'Standard deduction', 'Advance tax'],
          confidence: 0.95,
          calculation: { newRegime, oldRegime, income: amount },
        })
      }
    }
    
    // Process regular tax query
    const response = await processTaxQuery(query, conversationHistory || [])
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Tax chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    )
  }
}
