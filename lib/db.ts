import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

// Global cache for prisma instance
const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined
}

// Create Prisma client - called LAZILY only when needed
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  console.log('=== Creating Prisma Client ===')
  console.log('DATABASE_URL:', connectionString ? 'SET (' + connectionString.length + ' chars)' : 'NOT SET')
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // Use neon() HTTP function for serverless (no WebSocket needed)
  const sql = neon(connectionString)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeon(sql as any)
  
  console.log('Prisma client created successfully with neon()')
  return new PrismaClient({ adapter })
}

// Lazy getter - creates client only on first access
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma._prisma) {
    globalForPrisma._prisma = createPrismaClient()
  }
  return globalForPrisma._prisma
}

// For backward compatibility - use a getter that returns the client
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

export default prisma

