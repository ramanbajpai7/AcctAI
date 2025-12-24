import { PrismaClient } from '@prisma/client'

// Global cache for prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPromise: Promise<PrismaClient> | undefined
}

// Lazy async initialization
async function createPrismaClient(): Promise<PrismaClient> {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // Dynamic import to avoid build-time issues
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const pg = await import('pg')
  
  const pool = new pg.default.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Get or create prisma client
async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }
  
  if (!globalForPrisma.prismaPromise) {
    globalForPrisma.prismaPromise = createPrismaClient()
  }
  
  globalForPrisma.prisma = await globalForPrisma.prismaPromise
  return globalForPrisma.prisma
}

// For backward compatibility - synchronous access (will throw if not initialized)
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!globalForPrisma.prisma) {
      // Return a function that auto-initializes for common Prisma methods
      if (typeof prop === 'string' && !prop.startsWith('_')) {
        return new Proxy({}, {
          get(__, method) {
            return async (...args: unknown[]) => {
              const client = await getPrisma()
              const model = (client as unknown as Record<string, unknown>)[prop]
              if (model && typeof model === 'object') {
                const fn = (model as Record<string, unknown>)[method as string]
                if (typeof fn === 'function') {
                  return fn.apply(model, args)
                }
              }
              throw new Error(`Invalid Prisma method: ${String(prop)}.${String(method)}`)
            }
          }
        })
      }
    }
    return (globalForPrisma.prisma as unknown as Record<string, unknown>)?.[prop as string]
  },
})

export { getPrisma }
export default prisma

