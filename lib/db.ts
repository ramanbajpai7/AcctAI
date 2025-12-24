import { PrismaClient } from '@prisma/client'

// Global cache for prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

async function createPrismaClient(): Promise<PrismaClient> {
  const connectionString = process.env.DATABASE_URL
  
  console.log('Creating Prisma client...')
  console.log('DATABASE_URL exists:', !!connectionString)
  console.log('Is Vercel:', !!process.env.VERCEL)
  
  if (!connectionString) {
    console.warn('DATABASE_URL not set, using basic client')
    return new PrismaClient()
  }
  
  // On Vercel, use Neon serverless driver (required for edge/serverless)
  if (process.env.VERCEL) {
    const { PrismaNeon } = await import('@prisma/adapter-neon')
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(connectionString)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaNeon(sql as any)
    return new PrismaClient({ adapter })
  }
  
  // Locally, use standard pg driver (better compatibility)
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const pg = await import('pg')
  const pool = new pg.default.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Promise to store the initialization
let prismaPromise: Promise<PrismaClient> | null = null

// Lazy getter - only creates client when first accessed
function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return Promise.resolve(globalForPrisma.prisma)
  }
  
  if (!prismaPromise) {
    prismaPromise = createPrismaClient().then(client => {
      globalForPrisma.prisma = client
      return client
    })
  }
  
  return prismaPromise
}

// Create a proxy that forwards all property access to the lazily-created client
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    // Return a function that awaits the client then accesses the property
    if (typeof prop === 'string' && !prop.startsWith('_') && prop !== 'then') {
      return new Proxy({}, {
        get(_t, method: string | symbol) {
          return async (...args: unknown[]) => {
            const client = await getPrisma()
            const model = (client as unknown as Record<string, unknown>)[prop]
            if (model && typeof model === 'object') {
              const fn = (model as Record<string | symbol, unknown>)[method]
              if (typeof fn === 'function') {
                return fn.apply(model, args)
              }
            }
            throw new Error(`Invalid Prisma method: ${String(prop)}.${String(method)}`)
          }
        }
      })
    }
    return undefined
  }
})

export default prisma

