import prisma from '../lib/db'

// Default Indian Chart of Accounts for small businesses
const defaultLedgerAccounts = [
  // Expense Accounts
  { name: "Rent Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP001" },
  { name: "Utilities", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP002" },
  { name: "Electricity Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP003" },
  { name: "Telephone Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP004" },
  { name: "Internet Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP005" },
  { name: "Office Expenses", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP006" },
  { name: "Stationery & Printing", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP007" },
  { name: "Travelling Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP008" },
  { name: "Conveyance Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP009" },
  { name: "Salary Expense", group: "Expenses", subGroup: "Direct Expenses", code: "EXP010" },
  { name: "Wages", group: "Expenses", subGroup: "Direct Expenses", code: "EXP011" },
  { name: "Professional Fees", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP012" },
  { name: "Legal Charges", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP013" },
  { name: "Audit Fees", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP014" },
  { name: "Bank Charges", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP015" },
  { name: "Interest Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP016" },
  { name: "Insurance Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP017" },
  { name: "Repairs & Maintenance", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP018" },
  { name: "Advertisement Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP019" },
  { name: "Fuel Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP020" },
  { name: "Vehicle Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP021" },
  { name: "Food & Refreshment", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP022" },
  { name: "Entertainment Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP023" },
  { name: "Depreciation", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP024" },
  { name: "Miscellaneous Expense", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP025" },
  { name: "EMI Payment", group: "Expenses", subGroup: "Indirect Expenses", code: "EXP026" },
  { name: "GST Payment", group: "Expenses", subGroup: "Duties & Taxes", code: "EXP027" },
  { name: "TDS Payment", group: "Expenses", subGroup: "Duties & Taxes", code: "EXP028" },
  { name: "Income Tax", group: "Expenses", subGroup: "Duties & Taxes", code: "EXP029" },
  
  // Income Accounts
  { name: "Sales Account", group: "Income", subGroup: "Direct Income", code: "INC001" },
  { name: "Service Income", group: "Income", subGroup: "Direct Income", code: "INC002" },
  { name: "Interest Received", group: "Income", subGroup: "Indirect Income", code: "INC003" },
  { name: "Commission Received", group: "Income", subGroup: "Indirect Income", code: "INC004" },
  { name: "Discount Received", group: "Income", subGroup: "Indirect Income", code: "INC005" },
  { name: "Rental Income", group: "Income", subGroup: "Indirect Income", code: "INC006" },
  { name: "Other Income", group: "Income", subGroup: "Indirect Income", code: "INC007" },
  
  // Asset Accounts
  { name: "Cash in Hand", group: "Assets", subGroup: "Current Assets", code: "AST001" },
  { name: "Bank Account", group: "Assets", subGroup: "Current Assets", code: "AST002" },
  { name: "Accounts Receivable", group: "Assets", subGroup: "Current Assets", code: "AST003" },
  { name: "Inventory", group: "Assets", subGroup: "Current Assets", code: "AST004" },
  { name: "Prepaid Expenses", group: "Assets", subGroup: "Current Assets", code: "AST005" },
  { name: "Fixed Assets", group: "Assets", subGroup: "Fixed Assets", code: "AST006" },
  { name: "Furniture & Fixtures", group: "Assets", subGroup: "Fixed Assets", code: "AST007" },
  { name: "Computer & Equipment", group: "Assets", subGroup: "Fixed Assets", code: "AST008" },
  { name: "Vehicle", group: "Assets", subGroup: "Fixed Assets", code: "AST009" },
  
  // Liability Accounts
  { name: "Accounts Payable", group: "Liabilities", subGroup: "Current Liabilities", code: "LIA001" },
  { name: "Loans Payable", group: "Liabilities", subGroup: "Loans", code: "LIA002" },
  { name: "Bank Loan", group: "Liabilities", subGroup: "Loans", code: "LIA003" },
  { name: "GST Payable", group: "Liabilities", subGroup: "Duties & Taxes", code: "LIA004" },
  { name: "TDS Payable", group: "Liabilities", subGroup: "Duties & Taxes", code: "LIA005" },
  { name: "Salary Payable", group: "Liabilities", subGroup: "Current Liabilities", code: "LIA006" },
  { name: "Capital Account", group: "Liabilities", subGroup: "Capital", code: "LIA007" },
]

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create default ledger accounts
  for (const account of defaultLedgerAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { name: account.name },
      update: {},
      create: {
        ...account,
        isDefault: true,
      },
    })
  }
  
  console.log(`✅ Created ${defaultLedgerAccounts.length} default ledger accounts`)
  
  // Create demo user if not exists
  const demoUser = await prisma.user.upsert({
    where: { email: "accountant@example.com" },
    update: {},
    create: {
      email: "accountant@example.com",
      name: "Rahul Sharma",
      password: "demo123", // In production, use bcrypt
      firm: "Sharma & Associates",
      role: "accountant",
    },
  })
  
  console.log(`✅ Demo user created: ${demoUser.email}`)
  
  // Create junior user if not exists
  const juniorUser = await prisma.user.upsert({
    where: { email: "junior@example.com" },
    update: {},
    create: {
      email: "junior@example.com",
      name: "Priya Patel",
      password: "demo123", // In production, use bcrypt
      firm: "Sharma & Associates",
      role: "junior",
    },
  })
  
  console.log(`✅ Junior user created: ${juniorUser.email}`)
  
  // Create sample clients
  const sampleClients = [
    {
      name: "Acme Corporation",
      gstin: "27AAFFU5055K1Z0",
      pan: "AAAFR5055K",
      email: "contact@acme.com",
      phone: "9876543210",
      financialYear: "2024-25",
    },
    {
      name: "TechStart Industries",
      gstin: "27AAGFC1234K1Z5",
      pan: "AAGFC1234K",
      email: "hello@techstart.com",
      phone: "9876543211",
      financialYear: "2024-25",
    },
    {
      name: "XYZ Trading",
      gstin: "27AAHCY9012K1Z1",
      pan: "AAHCY9012K",
      email: "info@xyz.com",
      phone: "9876543212",
      financialYear: "2024-25",
    },
  ]
  
  for (const client of sampleClients) {
    await prisma.client.upsert({
      where: { 
        id: client.name.replace(/\s+/g, '-').toLowerCase() 
      },
      update: {},
      create: {
        id: client.name.replace(/\s+/g, '-').toLowerCase(),
        userId: demoUser.id,
        ...client,
      },
    })
  }
  
  console.log(`✅ Created ${sampleClients.length} sample clients`)
  
  // Create sample compliance tasks
  const today = new Date()
  const sampleTasks = [
    {
      title: "GSTR-1 Filing",
      clientId: "acme-corporation",
      category: "gst",
      priority: "high",
      dueDate: new Date(today.getFullYear(), today.getMonth(), 15),
    },
    {
      title: "GSTR-3B Filing",
      clientId: "techstart-industries",
      category: "gst",
      priority: "high",
      dueDate: new Date(today.getFullYear(), today.getMonth(), 20),
    },
    {
      title: "TDS Return Q3",
      clientId: "xyz-trading",
      category: "tds",
      priority: "medium",
      dueDate: new Date(today.getFullYear(), today.getMonth() + 1, 31),
    },
  ]
  
  for (const task of sampleTasks) {
    const existingTask = await prisma.complianceTask.findFirst({
      where: { title: task.title, clientId: task.clientId }
    })
    
    if (!existingTask) {
      await prisma.complianceTask.create({
        data: {
          userId: demoUser.id,
          ...task,
          status: "pending",
        },
      })
    }
  }
  
  console.log(`✅ Created sample compliance tasks`)
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
