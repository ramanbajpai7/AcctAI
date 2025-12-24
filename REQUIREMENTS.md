# Accountant Productivity Platform - Requirements Specification

## Executive Summary

A comprehensive platform to help accountants working with Tally ERP 9, MARG software, and compliance tasks reduce manual work through automation, intelligent reminders, and AI-powered assistance.

**Target Users:** Accountants and CA firms in India managing 20-100+ clients

**Core Value Proposition:** Save 15-20 hours per week through automation

---

## Phase 1: MVP Features (3-4 months)

### 1.1 Bank Statement Import Module

**Goal:** Save 3-4 hours daily on manual bank statement entry

| Feature | Priority | Description |
|---------|----------|-------------|
| Multi-format Upload | P0 | Support PDF, CSV, Excel formats |
| Transaction Extraction | P0 | Extract Date, Description, Debit, Credit, Balance |
| AI Categorization | P0 | Auto-categorize transactions using local LLM |
| Review Interface | P0 | Flag unrecognized patterns for review |
| Tally Export | P1 | One-click export to Tally XML format |

**Technical Requirements:**
- PDF parsing with `pdfplumber` or similar
- Excel/CSV parsing with `xlsx` or `papaparse`
- Local LLM (Ollama) for categorization
- Transaction review queue

---

### 1.2 Client Management

**Goal:** Organize clients with their compliance requirements

| Feature | Priority | Description |
|---------|----------|-------------|
| Client CRUD | P0 | Add, edit, delete, view clients |
| Client Profile | P0 | Name, GSTIN, PAN, Contact info, Financial year |
| Document Storage | P1 | Client-wise document organization |
| Compliance Assignment | P1 | Assign compliance types per client |

**Data Model:**
```
Client {
  id, name, gstin, pan, email, phone, address,
  financialYear, createdAt, updatedAt
}
```

---

### 1.3 Compliance Calendar & Reminders

**Goal:** Never miss a filing deadline

| Feature | Priority | Description |
|---------|----------|-------------|
| Calendar View | P0 | Monthly/weekly view with color-coded deadlines |
| Compliance Types | P0 | GST, ITR, TDS, ROC, Audit support |
| Task Status | P0 | Pending → In Progress → Completed |
| Email Reminders | P1 | Automated reminders 7, 3, 1 days before deadline |
| Client Filtering | P0 | Filter by client, compliance type |

**Compliance Types:**
- GST (GSTR-1, GSTR-3B, GSTR-9)
- Income Tax (ITR filing, Advance Tax)
- TDS (26Q, 27Q, 24Q)
- ROC (Annual Return, AOC-4)
- Audit (Tax Audit, GST Audit)

---

### 1.4 AI Ledger Suggestions (Local LLM)

**Goal:** Faster, more accurate transaction categorization

| Feature | Priority | Description |
|---------|----------|-------------|
| Ledger Suggestion | P0 | Suggest top 3 ledger accounts |
| Confidence Score | P0 | Show accuracy confidence (%) |
| Learning System | P1 | Learn from user's past selections |
| Custom Chart of Accounts | P1 | Support firm-specific ledger structure |

**LLM Integration:**
- Ollama with Llama 3.1 (8B) or Mistral 7B
- Runs locally for privacy
- Fallback to manual selection

---

### 1.5 Tally Integration

**Goal:** Reduce data entry in Tally ERP 9

| Feature | Priority | Description |
|---------|----------|-------------|
| XML Export | P0 | Generate Tally-compatible XML vouchers |
| Voucher Types | P0 | Payment, Receipt, Sales, Purchase, Journal |
| Batch Export | P1 | Export multiple vouchers at once |
| Validation | P1 | Validate GST calculations before export |

**Export Format:** Tally XML import format

---

## Phase 2: Enhanced Features (Future)

### 2.1 OCR Invoice Scanning
- Image/PDF invoice scanning
- Extract vendor, amount, GST, line items
- 90%+ accuracy target for printed invoices

### 2.2 WhatsApp Integration
- Automated document requests to clients
- Reminder notifications via WhatsApp Business API
- Document submission tracking

### 2.3 Client Portal
- Self-service document upload
- Compliance status visibility
- Filed return downloads

### 2.4 Bank-Tally Reconciliation
- Auto-match bank entries with Tally vouchers
- Fuzzy matching (amount, date ±3 days)
- Duplicate detection

---

## Phase 3: Advanced Features (Future)

### 3.1 GSTR Reconciliation
- GSTR-1 vs Sales Register comparison
- GSTR-2A vs Purchase comparison
- Mismatch reporting

### 3.2 Tax Query Chatbot
- RAG-based Q&A on tax rules
- Income Tax, GST, TDS references
- Offline capability with local LLM

### 3.3 Email Draft Generation
- AI-generated professional emails
- Document request templates
- Deadline reminder templates

### 3.4 Analytics Dashboard
- Time saved metrics
- Client workload distribution
- Compliance adherence rates

---

## Technical Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL with Prisma ORM |
| AI/LLM | Ollama (local) with Llama 3.1 / Mistral |
| Auth | NextAuth v5 |
| File Storage | Local filesystem / S3-compatible |

### Key Integrations
- **Tally ERP 9:** XML import/export
- **Email:** Nodemailer / SendGrid
- **Future:** WhatsApp Business API, Twilio SMS

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time Saved | 2-3 hours/day |
| Data Entry Errors | 80-90% reduction |
| On-time Filings | 95%+ |
| Client Capacity | Handle 50% more clients |

---

## User Stories Summary

### MVP User Stories

1. **US-1.1:** As an accountant, I want to upload bank statements and auto-extract transactions
2. **US-1.2:** As an accountant, I want AI to suggest ledger accounts for transactions
3. **US-1.3:** As an accountant, I want to export verified transactions to Tally XML
4. **US-2.1:** As an accountant, I want to see all client compliance deadlines in a calendar
5. **US-2.2:** As an accountant, I want automatic email reminders before deadlines
6. **US-3.1:** As an accountant, I want to manage client profiles with GSTIN/PAN

---

## Cost Estimation

| Item | Monthly Cost |
|------|--------------|
| Hosting (Vercel/Railway) | ₹0-2,000 |
| Database (Supabase/Railway) | ₹0-1,000 |
| Email (SendGrid free tier) | ₹0 |
| LLM (Local Ollama) | ₹0 |
| **Total** | **₹0-3,000/month** |

---

## Development Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 MVP | 3-4 months | Bank import, Tally export, Calendar, AI suggestions |
| Phase 2 | 2-3 months | OCR, WhatsApp, Client portal |
| Phase 3 | 2-3 months | Reconciliation, Chatbot, Analytics |

---

*Document Version: 1.0*  
*Last Updated: December 24, 2024*
