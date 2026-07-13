import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5435/rrgpt"

// Disable statement preparation to support connection pooling and bouncers
const client = postgres(connectionString, { 
  prepare: false 
})

export const db = drizzle(client, { schema })
