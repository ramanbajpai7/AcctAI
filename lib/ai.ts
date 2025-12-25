// Multi-provider AI client for production use
// Supports Groq (primary) and Google Gemini (fallback)

export interface LedgerSuggestion {
  ledger: string
  confidence: number
  reason: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIResponse {
  content: string
  provider: 'groq' | 'gemini' | 'fallback'
}

// Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

// Default models
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
const GEMINI_MODEL = 'gemini-1.5-flash'

// Common ledger accounts for fallback
const commonLedgers = [
  { name: 'Rent Expense', keywords: ['rent', 'lease', 'property'] },
  { name: 'Electricity Expense', keywords: ['electricity', 'power', 'bescom', 'mseb'] },
  { name: 'Telephone Expense', keywords: ['phone', 'mobile', 'jio', 'airtel', 'vodafone', 'bsnl'] },
  { name: 'Internet Expense', keywords: ['internet', 'broadband', 'wifi', 'fiber'] },
  { name: 'Salary Expense', keywords: ['salary', 'wages', 'payroll'] },
  { name: 'Office Expenses', keywords: ['office', 'supplies', 'stationery'] },
  { name: 'Travelling Expense', keywords: ['travel', 'flight', 'train', 'cab', 'uber', 'ola'] },
  { name: 'Fuel Expense', keywords: ['fuel', 'petrol', 'diesel', 'gas', 'iocl', 'bpcl', 'hpcl'] },
  { name: 'Food & Refreshment', keywords: ['food', 'restaurant', 'swiggy', 'zomato', 'hotel'] },
  { name: 'Bank Charges', keywords: ['bank charge', 'service charge', 'sms charge'] },
  { name: 'Insurance Expense', keywords: ['insurance', 'lic', 'policy', 'premium'] },
  { name: 'Professional Fees', keywords: ['professional', 'consultant', 'advisory'] },
  { name: 'Legal Charges', keywords: ['legal', 'advocate', 'lawyer', 'attorney'] },
  { name: 'Repairs & Maintenance', keywords: ['repair', 'maintenance', 'service', 'amc'] },
  { name: 'Advertisement Expense', keywords: ['advertisement', 'marketing', 'google ads'] },
  { name: 'GST Payment', keywords: ['gst', 'cgst', 'sgst', 'igst'] },
  { name: 'TDS Payment', keywords: ['tds', 'tax deducted'] },
  { name: 'EMI Payment', keywords: ['emi', 'loan', 'installment'] },
  { name: 'Sales Account', keywords: ['sale', 'revenue', 'income', 'receipt'] },
  { name: 'Interest Received', keywords: ['interest received', 'int recd'] },
  { name: 'Interest Expense', keywords: ['interest paid', 'int paid'] },
]

// Fallback: Rule-based suggestion using keywords
function getKeywordBasedSuggestion(description: string): LedgerSuggestion[] {
  const descLower = description.toLowerCase()
  const matches: { name: string; score: number }[] = []
  
  for (const ledger of commonLedgers) {
    for (const keyword of ledger.keywords) {
      if (descLower.includes(keyword)) {
        const existing = matches.find(m => m.name === ledger.name)
        if (existing) {
          existing.score += 10
        } else {
          matches.push({ name: ledger.name, score: 10 })
        }
      }
    }
  }
  
  matches.sort((a, b) => b.score - a.score)
  
  if (matches.length === 0) {
    return [{ ledger: 'Miscellaneous Expense', confidence: 50, reason: 'No specific match found' }]
  }
  
  return matches.slice(0, 3).map((m, i) => ({
    ledger: m.name,
    confidence: Math.max(90 - i * 15, 50),
    reason: 'Matched keywords in description',
  }))
}

// Check which AI provider is available
export function getAvailableProvider(): 'groq' | 'gemini' | 'none' {
  if (GROQ_API_KEY) return 'groq'
  if (GEMINI_API_KEY) return 'gemini'
  return 'none'
}

// Call Groq API
async function callGroq(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set')
  
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30000),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Call Gemini API
async function callGemini(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')
  
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }))
  
  // Add system instruction if present
  const systemMsg = messages.find(m => m.role === 'system')
  
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
      },
    }),
    signal: AbortSignal.timeout(30000),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Main AI chat function with fallback
export async function chatWithAI(
  messages: ChatMessage[],
  options: { temperature?: number } = {}
): Promise<AIResponse> {
  const { temperature = 0.3 } = options
  
  // Try Groq first (fastest)
  if (GROQ_API_KEY) {
    try {
      const content = await callGroq(messages, temperature)
      return { content, provider: 'groq' }
    } catch (error) {
      console.error('Groq API failed, trying Gemini:', error)
    }
  }
  
  // Try Gemini as fallback
  if (GEMINI_API_KEY) {
    try {
      const content = await callGemini(messages, temperature)
      return { content, provider: 'gemini' }
    } catch (error) {
      console.error('Gemini API failed:', error)
    }
  }
  
  // No AI available
  return { content: '', provider: 'fallback' }
}

// Get ledger suggestions using AI
export async function suggestLedgerWithAI(
  description: string,
  amount: number,
  type: 'debit' | 'credit',
  availableLedgers?: string[]
): Promise<LedgerSuggestion[]> {
  const provider = getAvailableProvider()
  
  if (provider === 'none') {
    console.log('No AI provider available, using keyword-based suggestions')
    return getKeywordBasedSuggestion(description)
  }
  
  try {
    const ledgerList = availableLedgers?.join(', ') || 
      commonLedgers.map(l => l.name).join(', ')
    
    const systemPrompt = `You are an expert accountant in India. Analyze bank transactions and suggest appropriate ledger accounts.
Always respond with ONLY a JSON object, no markdown or explanation.`

    const userPrompt = `Transaction Details:
- Description: "${description}"
- Amount: ₹${amount.toLocaleString('en-IN')}
- Type: ${type === 'debit' ? 'Money paid/withdrawn' : 'Money received/deposited'}

Available Ledger Accounts: ${ledgerList}

Respond with this exact JSON format:
{"suggestions": [{"ledger": "Account Name", "confidence": 95, "reason": "Brief reason"}, ...]}

Provide exactly 3 suggestions ordered by confidence (highest first, 0-100).`

    const response = await chatWithAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    
    if (response.provider === 'fallback') {
      return getKeywordBasedSuggestion(description)
    }
    
    // Parse the JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions.slice(0, 3).map((s: any) => ({
          ledger: s.ledger || 'Miscellaneous Expense',
          confidence: Math.min(100, Math.max(0, s.confidence || 50)),
          reason: s.reason || 'AI suggestion',
        }))
      }
    }
    
    return getKeywordBasedSuggestion(description)
  } catch (error) {
    console.error('Error getting AI suggestion:', error)
    return getKeywordBasedSuggestion(description)
  }
}

// Batch process multiple transactions
export async function batchSuggestLedgers(
  transactions: { id: string; description: string; amount: number; type: 'debit' | 'credit' }[]
): Promise<Map<string, LedgerSuggestion[]>> {
  const results = new Map<string, LedgerSuggestion[]>()
  
  for (const txn of transactions) {
    const suggestions = await suggestLedgerWithAI(txn.description, txn.amount, txn.type)
    results.set(txn.id, suggestions)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

// Check AI health/availability
export async function checkAIHealth(): Promise<{ available: boolean; provider: string }> {
  const provider = getAvailableProvider()
  
  if (provider === 'none') {
    return { available: false, provider: 'none' }
  }
  
  try {
    const response = await chatWithAI([
      { role: 'user', content: 'Say "OK" if you can hear me.' }
    ])
    return { available: response.content.length > 0, provider: response.provider }
  } catch {
    return { available: false, provider }
  }
}
