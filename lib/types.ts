// Data types for the accountant automation platform

export interface User {
  id: string
  email: string
  name: string
  firm?: string
  role: "accountant" | "junior" | "admin"
  createdAt: Date
}

export interface Client {
  id: string
  firmId: string
  name: string
  gstin?: string
  pan?: string
  email?: string
  phone?: string
  address?: string
  financialYear?: string
  createdAt: Date
  updatedAt: Date
}

export interface BankStatement {
  id: string
  clientId: string
  fileName: string
  uploadedAt: Date
  startDate: Date
  endDate: Date
  transactionCount: number
  totalAmount: number
  status: "processing" | "completed" | "error"
  errorMessage?: string
}

export interface Transaction {
  id: string
  bankStatementId: string
  date: Date
  description: string
  amount: number
  type: "debit" | "credit"
  suggestedLedger?: string
  approvedLedger?: string
  status: "pending" | "approved" | "rejected"
}

export interface ComplianceTask {
  id: string
  clientId: string
  title: string
  description?: string
  dueDate: Date
  category: "gst" | "income-tax" | "filing" | "audit" | "other"
  priority: "low" | "medium" | "high"
  status: "pending" | "in-progress" | "completed"
  assignedTo?: string
  createdAt: Date
}

export interface LedgerSuggestion {
  id: string
  transactionId: string
  suggestedAccount: string
  confidence: number
  reason: string
  createdAt: Date
}
