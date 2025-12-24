// Tally XML Generator for voucher export
// Generates Tally ERP 9 compatible XML for import

interface TallyVoucher {
  voucherType: 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase'
  date: Date
  narration: string
  reference?: string
  entries: {
    ledgerName: string
    amount: number
    isDr: boolean
  }[]
}

interface Transaction {
  id: string
  date: Date
  description: string
  reference?: string | null
  amount: number
  type: 'debit' | 'credit'
  approvedLedger?: string | null
  bankStatement?: {
    client?: {
      name: string
    } | null
  } | null
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateVoucherXml(voucher: TallyVoucher, voucherNumber: number): string {
  const dateStr = formatDate(voucher.date)
  const vchNumber = `V${voucherNumber.toString().padStart(6, '0')}`
  
  const entriesXml = voucher.entries.map(entry => `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(entry.ledgerName)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${entry.isDr ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${entry.isDr ? -entry.amount : entry.amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`
  ).join('')
  
  return `
    <VOUCHER VCHTYPE="${voucher.voucherType}" ACTION="Create">
      <DATE>${dateStr}</DATE>
      <VOUCHERTYPENAME>${voucher.voucherType}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${vchNumber}</VOUCHERNUMBER>
      <REFERENCE>${escapeXml(voucher.reference || '')}</REFERENCE>
      <NARRATION>${escapeXml(voucher.narration)}</NARRATION>
      <EFFECTIVEDATE>${dateStr}</EFFECTIVEDATE>
      <ISINVOICE>No</ISINVOICE>
      <ISPOSTDATED>No</ISPOSTDATED>
      <ISOPTIONAL>No</ISOPTIONAL>
      <ISCANCELLED>No</ISCANCELLED>
      <ALTERID>${voucherNumber}</ALTERID>
      ${entriesXml}
    </VOUCHER>`
}

export function transactionToVoucher(
  transaction: Transaction,
  bankLedger: string = 'Bank Account'
): TallyVoucher {
  const ledgerName = transaction.approvedLedger || 'Suspense Account'
  const clientName = transaction.bankStatement?.client?.name || 'Unknown'
  
  // Determine voucher type based on transaction type
  const voucherType = transaction.type === 'debit' ? 'Payment' : 'Receipt'
  
  return {
    voucherType,
    date: new Date(transaction.date),
    narration: `${transaction.description} - ${clientName}`,
    reference: transaction.reference || undefined,
    entries: [
      {
        // First entry: The expense/income account
        ledgerName,
        amount: transaction.amount,
        isDr: transaction.type === 'debit', // Dr for expenses
      },
      {
        // Second entry: Bank account
        ledgerName: bankLedger,
        amount: transaction.amount,
        isDr: transaction.type === 'credit', // Dr for money received (bank increases)
      },
    ],
  }
}

export function generateTallyXml(transactions: Transaction[], bankLedger?: string): string {
  const vouchers = transactions.map((txn, idx) =>
    generateVoucherXml(transactionToVoucher(txn, bankLedger), idx + 1)
  )
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${vouchers.join('\n          ')}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

  return xml
}

// Generate a summary of what will be exported
export function generateExportSummary(transactions: Transaction[]): {
  totalTransactions: number
  totalDebit: number
  totalCredit: number
  byLedger: Record<string, { count: number; amount: number }>
  byClient: Record<string, number>
} {
  const byLedger: Record<string, { count: number; amount: number }> = {}
  const byClient: Record<string, number> = {}
  let totalDebit = 0
  let totalCredit = 0
  
  for (const txn of transactions) {
    const ledger = txn.approvedLedger || 'Unclassified'
    const client = txn.bankStatement?.client?.name || 'Unknown'
    
    if (!byLedger[ledger]) {
      byLedger[ledger] = { count: 0, amount: 0 }
    }
    byLedger[ledger].count++
    byLedger[ledger].amount += txn.amount
    
    byClient[client] = (byClient[client] || 0) + 1
    
    if (txn.type === 'debit') {
      totalDebit += txn.amount
    } else {
      totalCredit += txn.amount
    }
  }
  
  return {
    totalTransactions: transactions.length,
    totalDebit,
    totalCredit,
    byLedger,
    byClient,
  }
}
