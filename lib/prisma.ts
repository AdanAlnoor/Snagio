import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure connection pool settings
const databaseUrl = process.env.DATABASE_URL

// Add optimized connection pool parameters
const pooledDatabaseUrl = databaseUrl?.includes('?')
  ? `${databaseUrl}&connection_limit=20&pool_timeout=10&pgbouncer=true`
  : `${databaseUrl}?connection_limit=20&pool_timeout=10&pgbouncer=true`

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG === 'true'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: pooledDatabaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Ensure proper cleanup on hot reload in development
if (process.env.NODE_ENV === 'development') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
