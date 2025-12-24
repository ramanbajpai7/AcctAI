import { InvoiceScanner } from "@/components/dashboard/invoice-scanner"

export default function InvoiceScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Invoice Scanner</h1>
        <p className="text-muted-foreground mt-1">
          Scan invoices with OCR to automatically extract vendor details, amounts, and GST information
        </p>
      </div>
      <InvoiceScanner />
    </div>
  )
}
