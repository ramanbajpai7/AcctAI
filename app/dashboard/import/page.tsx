import { BankImportSection } from "@/components/dashboard/bank-import"

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Bank Import</h1>
      <p className="text-muted-foreground mb-6">Upload bank statements and let AI process them automatically</p>
      <BankImportSection />
    </div>
  )
}
