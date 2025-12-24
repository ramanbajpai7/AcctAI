import { AILedgerSuggestions } from "@/components/dashboard/ai-ledger"

export default function LedgerPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">AI Ledger Suggestions</h1>
      <p className="text-muted-foreground mb-6">Review AI-powered ledger account suggestions for transactions</p>
      <AILedgerSuggestions />
    </div>
  )
}
