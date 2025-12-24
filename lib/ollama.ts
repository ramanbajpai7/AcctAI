// Ollama LLM client for AI-powered ledger suggestions
// Works with locally running Ollama instance

export interface LedgerSuggestion {
  ledger: string
  confidence: number
  reason: string
}

interface OllamaResponse {
  model: string
  response: string
  done: boolean
}

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b'

// List of common ledger accounts for fallback suggestions
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
  { name: 'Bank Charges', keywords: ['bank charge', 'service charge', 'sms charge', 'annual maintenance'] },
  { name: 'Insurance Expense', keywords: ['insurance', 'lic', 'policy', 'premium'] },
  { name: 'Professional Fees', keywords: ['professional', 'consultant', 'advisory'] },
  { name: 'Legal Charges', keywords: ['legal', 'advocate', 'lawyer', 'attorney'] },
  { name: 'Repairs & Maintenance', keywords: ['repair', 'maintenance', 'service', 'amc'] },
  { name: 'Advertisement Expense', keywords: ['advertisement', 'marketing', 'google ads', 'facebook'] },
  { name: 'GST Payment', keywords: ['gst', 'cgst', 'sgst', 'igst'] },
  { name: 'TDS Payment', keywords: ['tds', 'tax deducted'] },
  { name: 'EMI Payment', keywords: ['emi', 'loan', 'installment'] },
  { name: 'Sales Account', keywords: ['sale', 'revenue', 'income', 'receipt'] },
  { name: 'Interest Received', keywords: ['interest received', 'int recd', 'interest income'] },
  { name: 'Interest Expense', keywords: ['interest paid', 'int paid', 'interest expense', 'int exp'] },
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
  
  // Sort by score and return top 3
  matches.sort((a, b) => b.score - a.score)
  
  if (matches.length === 0) {
    return [
      { ledger: 'Miscellaneous Expense', confidence: 50, reason: 'No specific match found' }
    ]
  }
  
  return matches.slice(0, 3).map((m, i) => ({
    ledger: m.name,
    confidence: Math.max(90 - i * 15, 50),
    reason: `Matched keywords in description`,
  }))
}

// Check if Ollama is available
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

// Get ledger suggestions using Ollama
export async function suggestLedgerWithAI(
  description: string,
  amount: number,
  type: 'debit' | 'credit',
  availableLedgers?: string[]
): Promise<LedgerSuggestion[]> {
  // First check if Ollama is available
  const ollamaAvailable = await checkOllamaHealth()
  
  if (!ollamaAvailable) {
    console.log('Ollama not available, using keyword-based suggestions')
    return getKeywordBasedSuggestion(description)
  }
  
  try {
    const ledgerList = availableLedgers?.join(', ') || 
      commonLedgers.map(l => l.name).join(', ')
    
    const prompt = `You are an expert accountant in India. Analyze this bank transaction and suggest the most appropriate ledger account.

Transaction Details:
- Description: "${description}"
- Amount: ₹${amount.toLocaleString('en-IN')}
- Type: ${type === 'debit' ? 'Money paid/withdrawn' : 'Money received/deposited'}

Available Ledger Accounts: ${ledgerList}

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "suggestions": [
    {"ledger": "Account Name 1", "confidence": 95, "reason": "Brief reason"},
    {"ledger": "Account Name 2", "confidence": 75, "reason": "Brief reason"},
    {"ledger": "Account Name 3", "confidence": 55, "reason": "Brief reason"}
  ]
}

Provide exactly 3 suggestions ordered by confidence (highest first). Confidence should be 0-100.`

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 500,
        },
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`)
    }
    
    const data: OllamaResponse = await response.json()
    
    // Parse the JSON response
    const jsonMatch = data.response.match(/\{[\s\S]*\}/)
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
    
    // If parsing fails, fallback to keyword-based
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
  
  // Process sequentially to avoid overwhelming Ollama
  for (const txn of transactions) {
    const suggestions = await suggestLedgerWithAI(txn.description, txn.amount, txn.type)
    results.set(txn.id, suggestions)
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}
