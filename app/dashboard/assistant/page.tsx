import { TaxChatbot } from "@/components/dashboard/tax-chatbot"

export default function TaxAssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tax Assistant</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered assistant for GST, Income Tax, and TDS queries
        </p>
      </div>
      <TaxChatbot />
    </div>
  )
}
