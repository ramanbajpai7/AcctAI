// Tax Query Chatbot Service
// AI-powered assistant for answering tax-related questions

import { chatWithAI, getAvailableProvider } from './ai'

// Common Indian tax knowledge base
const taxKnowledge = {
  gst: {
    rates: {
      '0': ['Essential goods', 'Fresh food', 'Education', 'Healthcare'],
      '5': ['Packaged food', 'Economy hotels', 'Transport', 'Small restaurants'],
      '12': ['Processed food', 'Business class hotels', 'Work contracts'],
      '18': ['Most services', 'IT services', 'Restaurants with AC', 'Financial services'],
      '28': ['Luxury items', 'Automobiles', 'Aerated drinks', 'Tobacco'],
    },
    dueDates: {
      'GSTR-1': '11th of following month (monthly) or 13th of following quarter (QRMP)',
      'GSTR-3B': '20th of following month (monthly) or 22nd-24th (quarterly)',
      'GSTR-9': '31st December of following year',
      'GSTR-9C': '31st December of following year',
    },
    penalties: {
      'Late filing GSTR-1': '₹50/day (₹20 for nil return) up to ₹10,000',
      'Late filing GSTR-3B': '₹50/day (₹20 for nil return) + 18% interest on tax',
      'Wrong invoice': 'Up to 100% of tax amount or ₹10,000',
    },
  },
  incomeTax: {
    slabs_old: [
      { min: 0, max: 250000, rate: 0 },
      { min: 250001, max: 500000, rate: 5 },
      { min: 500001, max: 1000000, rate: 20 },
      { min: 1000001, max: Infinity, rate: 30 },
    ],
    slabs_new: [
      { min: 0, max: 300000, rate: 0 },
      { min: 300001, max: 700000, rate: 5 },
      { min: 700001, max: 1000000, rate: 10 },
      { min: 1000001, max: 1200000, rate: 15 },
      { min: 1200001, max: 1500000, rate: 20 },
      { min: 1500001, max: Infinity, rate: 30 },
    ],
    dueDates: {
      'ITR (Non-audit)': 'July 31st',
      'ITR (Audit)': 'October 31st',
      'Advance Tax Q1': 'June 15th (15%)',
      'Advance Tax Q2': 'September 15th (45%)',
      'Advance Tax Q3': 'December 15th (75%)',
      'Advance Tax Q4': 'March 15th (100%)',
    },
    deductions: {
      '80C': '₹1,50,000 - PPF, ELSS, Life Insurance, NSC, etc.',
      '80D': '₹25,000 - Health Insurance (₹50,000 for senior citizens)',
      '80E': 'Full interest - Education loan',
      '80G': '50-100% - Donations',
      '80TTA': '₹10,000 - Savings interest',
      '80TTB': '₹50,000 - Interest for senior citizens',
      '80CCD(1B)': '₹50,000 - Additional NPS contribution',
      '24(b)': '₹2,00,000 - Home loan interest',
    },
  },
  tds: {
    rates: {
      '194A': '10% - Interest (bank)',
      '194C': '1%/2% - Contractor payment',
      '194H': '5% - Commission',
      '194I': '10% - Rent',
      '194J': '10% - Professional fees',
      '194Q': '0.1% - Purchase of goods (>₹50L)',
      '194N': '2%/5% - Cash withdrawal',
    },
    dueDates: {
      'TDS Payment': '7th of next month (30th April for March)',
      'TDS Return Q1': 'July 31st',
      'TDS Return Q2': 'October 31st',
      'TDS Return Q3': 'January 31st',
      'TDS Return Q4': 'May 31st',
    },
  },
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatResponse {
  answer: string
  sources: string[]
  relatedTopics: string[]
  confidence: number
}

// Process tax query using knowledge base and AI
export async function processTaxQuery(
  query: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  const queryLower = query.toLowerCase()
  let answer = ''
  let sources: string[] = []
  let relatedTopics: string[] = []
  let confidence = 0.8
  
  // Check for GST rate queries
  if (queryLower.includes('gst rate') || queryLower.includes('gst slab')) {
    const rates = taxKnowledge.gst.rates
    answer = `**GST Rate Structure in India:**\n\n`
    for (const [rate, items] of Object.entries(rates)) {
      answer += `**${rate}%**: ${items.join(', ')}\n`
    }
    sources.push('CGST Act 2017', 'GST Rate Schedule')
    relatedTopics.push('GST registration', 'Input Tax Credit', 'E-way bill')
    confidence = 0.95
  }
  
  // Check for GST due dates
  else if (queryLower.includes('gstr') && (queryLower.includes('due') || queryLower.includes('date') || queryLower.includes('deadline'))) {
    const dates = taxKnowledge.gst.dueDates
    answer = `**GSTR Due Dates:**\n\n`
    for (const [form, date] of Object.entries(dates)) {
      answer += `• **${form}**: ${date}\n`
    }
    sources.push('CGST Rule 59-62')
    relatedTopics.push('Late filing penalty', 'GST return filing', 'QRMP scheme')
    confidence = 0.95
  }
  
  // Check for GST penalty queries
  else if (queryLower.includes('penalty') && queryLower.includes('gst')) {
    const penalties = taxKnowledge.gst.penalties
    answer = `**GST Late Filing Penalties:**\n\n`
    for (const [type, penalty] of Object.entries(penalties)) {
      answer += `• **${type}**: ${penalty}\n`
    }
    sources.push('Section 47 CGST Act', 'Section 122 CGST Act')
    relatedTopics.push('GST interest', 'Revocation of cancellation', 'GST amnesty')
    confidence = 0.9
  }
  
  // Check for income tax slab queries
  else if (queryLower.includes('income tax') && (queryLower.includes('slab') || queryLower.includes('rate'))) {
    answer = `**Income Tax Slabs (FY 2024-25):**\n\n`
    answer += `**New Tax Regime (Default):**\n`
    for (const slab of taxKnowledge.incomeTax.slabs_new) {
      const max = slab.max === Infinity ? 'Above' : `₹${(slab.max/100000).toFixed(0)}L`
      answer += `• ₹${(slab.min/100000).toFixed(0)}L - ${max}: ${slab.rate}%\n`
    }
    answer += `\n**Old Tax Regime (with deductions):**\n`
    for (const slab of taxKnowledge.incomeTax.slabs_old) {
      const max = slab.max === Infinity ? 'Above' : `₹${(slab.max/100000).toFixed(0)}L`
      answer += `• ₹${(slab.min/100000).toFixed(0)}L - ${max}: ${slab.rate}%\n`
    }
    sources.push('Finance Act 2024', 'Section 115BAC')
    relatedTopics.push('Standard deduction', 'Section 80C deductions', 'HRA exemption')
    confidence = 0.95
  }
  
  // Check for deduction queries
  else if (queryLower.includes('deduction') || queryLower.includes('80c') || queryLower.includes('80d')) {
    const deductions = taxKnowledge.incomeTax.deductions
    answer = `**Income Tax Deductions (Old Regime):**\n\n`
    for (const [section, details] of Object.entries(deductions)) {
      answer += `• **Section ${section}**: ${details}\n`
    }
    answer += `\n*Note: Most deductions not available in New Tax Regime except standard deduction.*`
    sources.push('Income Tax Act 1961', 'Chapter VI-A')
    relatedTopics.push('Tax saving investments', 'ELSS funds', 'NPS benefits')
    confidence = 0.9
  }
  
  // Check for TDS queries
  else if (queryLower.includes('tds')) {
    if (queryLower.includes('rate')) {
      const rates = taxKnowledge.tds.rates
      answer = `**TDS Rates:**\n\n`
      for (const [section, rate] of Object.entries(rates)) {
        answer += `• **Section ${section}**: ${rate}\n`
      }
    } else if (queryLower.includes('due') || queryLower.includes('date')) {
      const dates = taxKnowledge.tds.dueDates
      answer = `**TDS Due Dates:**\n\n`
      for (const [type, date] of Object.entries(dates)) {
        answer += `• **${type}**: ${date}\n`
      }
    } else {
      answer = `**TDS Overview:**\n\nTDS (Tax Deducted at Source) is advance tax collected by the payer on behalf of the government.\n\nKey aspects:\n`
      answer += `• Applicable on salary, interest, rent, professional fees, etc.\n`
      answer += `• Must be deposited by 7th of next month\n`
      answer += `• TDS return filed quarterly\n`
      answer += `• TAN (Tax Deduction Account Number) required to deduct TDS`
    }
    sources.push('TDS Provisions (Section 192-206)', 'Income Tax Rules')
    relatedTopics.push('TDS certificate (Form 16)', 'TDS challan', 'Lower TDS certificate')
    confidence = 0.9
  }
  
  // Check for ITR due dates
  else if (queryLower.includes('itr') && (queryLower.includes('due') || queryLower.includes('date'))) {
    const dates = taxKnowledge.incomeTax.dueDates
    answer = `**Income Tax Due Dates:**\n\n`
    for (const [type, date] of Object.entries(dates)) {
      answer += `• **${type}**: ${date}\n`
    }
    sources.push('Section 139 Income Tax Act')
    relatedTopics.push('Belated return', 'Revised return', 'ITR forms')
    confidence = 0.95
  }
  
  // Generic query - use AI if available
  else {
    // Try AI for complex queries
    const provider = getAvailableProvider()
    
    if (provider !== 'none') {
      try {
        const systemPrompt = `You are an expert Indian tax consultant. Answer questions about:
- GST (Goods and Services Tax) - rates, filing, ITC, e-way bills
- Income Tax - slabs, deductions, ITR filing, advance tax
- TDS (Tax Deducted at Source) - rates, returns, Form 16

Provide accurate, practical answers based on current Indian tax laws (FY 2024-25).
Format your response in markdown with bullet points.
Be concise but thorough. Include relevant section numbers when applicable.`

        const response = await chatWithAI([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ])
        
        if (response.content) {
          answer = response.content
          sources.push(`AI-powered response (${response.provider})`)
          relatedTopics.push('Consult a CA for specific advice')
          confidence = 0.75
        }
      } catch (error) {
        console.error('AI query failed:', error)
      }
    }
    
    // Fallback if AI didn't respond
    if (!answer) {
      answer = `I can help you with:\n\n`
      answer += `• **GST**: Rates, GSTR filing, due dates, ITC, e-way bills\n`
      answer += `• **Income Tax**: Tax slabs, deductions, ITR filing, advance tax\n`
      answer += `• **TDS**: Rates, due dates, TDS returns, Form 16\n`
      answer += `• **Compliance**: Penalties, interest, reconciliation\n\n`
      answer += `Please ask a specific question about any of these topics.`
      sources.push('General tax knowledge')
      relatedTopics.push('GST rates', 'Income tax slabs', 'TDS rates', 'Filing due dates')
      confidence = 0.5
    }
  }
  
  return {
    answer,
    sources,
    relatedTopics,
    confidence,
  }
}

// Quick tax calculation
export function calculateIncomeTax(income: number, regime: 'old' | 'new' = 'new'): {
  taxableIncome: number
  tax: number
  cess: number
  totalTax: number
  effectiveRate: number
} {
  const slabs = regime === 'new' 
    ? taxKnowledge.incomeTax.slabs_new 
    : taxKnowledge.incomeTax.slabs_old
  
  let tax = 0
  let remainingIncome = income
  
  // Standard deduction (available in both regimes now)
  const standardDeduction = 50000
  remainingIncome = Math.max(0, remainingIncome - standardDeduction)
  
  for (const slab of slabs) {
    if (remainingIncome <= 0) break
    
    const taxableInSlab = Math.min(remainingIncome, slab.max - slab.min + 1)
    tax += (taxableInSlab * slab.rate) / 100
    remainingIncome -= taxableInSlab
  }
  
  // Health & Education Cess (4%)
  const cess = tax * 0.04
  
  return {
    taxableIncome: income - standardDeduction,
    tax,
    cess,
    totalTax: tax + cess,
    effectiveRate: ((tax + cess) / income) * 100,
  }
}
