import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// Enable WebSocket for local development
if (typeof window === 'undefined' && !process.env.VERCEL) {
  // Only import ws in Node.js environment (not on Vercel edge)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws')
    neonConfig.webSocketConstructor = ws
  } catch {
    // ws not available, that's fine on Vercel
  }
}

// Global cache for prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  console.log('Creating Prisma client...')
  console.log('DATABASE_URL exists:', !!connectionString)
  
  if (!connectionString) {
    console.error('DATABASE_URL not set!')
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // Use Neon Pool for database connection
  const pool = new Pool({ connectionString })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeon(pool as any)
  return new PrismaClient({ adapter })
}

// Get or create prisma client
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

export const prisma = getPrisma()

export default prisma

