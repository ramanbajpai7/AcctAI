import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Global cache for prisma instance to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  console.log('=== Creating Prisma Client ===')
  console.log('DATABASE_URL:', connectionString ? 'SET (' + connectionString.length + ' chars)' : 'NOT SET')
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // Create pg Pool with the connection string
  const pool = new Pool({ connectionString })
  
  // Create the Prisma Pg adapter
  const adapter = new PrismaPg(pool)
  
  console.log('Prisma client created with pg adapter')
  
  // In Prisma 7, the adapter handles the connection
  return new PrismaClient({ adapter })
}

// Create or reuse the Prisma client
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// In development, store the client in global to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
