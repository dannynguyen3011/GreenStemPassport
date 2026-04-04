import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Lazy singleton so connection is only opened when first needed
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (_db) return _db

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, {
    prepare: false, // required for Supabase transaction pooler
  })

  _db = drizzle(client, { schema })
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop]
  },
})

export { schema }
