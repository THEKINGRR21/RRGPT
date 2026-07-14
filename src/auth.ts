import NextAuth, { AuthOptions, getServerSession } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import Email from "next-auth/providers/email"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export const authOptions: AuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db) as any,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Email({
      server: {
        host: process.env.SMTP_HOST || "localhost",
        port: parseInt(process.env.SMTP_PORT || "587"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.SMTP_FROM || "noreply@rrgpt.internal",
    }),
    Credentials({
      id: "developer-bypass",
      name: "Developer Bypass",
      credentials: {
        email: { label: "Email", type: "email", defaultValue: "dev@rrgpt.internal" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string) || "dev@rrgpt.internal"
        if (email !== "dev@rrgpt.internal") return null
        
        try {
          // Verify if user exists in database, or create a mock dev user
          const userList = await db.select().from(users).where(eq(users.email, email)).limit(1)
          let user = userList[0]

          if (!user) {
            const [newUser] = await db
              .insert(users)
              .values({
                id: crypto.randomUUID(),
                email,
                name: email.split("@")[0] || "Dev Local",
                role: "dev",
              })
              .returning()
            user = newUser
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        } catch (err) {
          console.error("Developer login bypass error:", err)
          // Fallback to local memory mock profile if database is initializing
          return {
            id: "dev-user-id",
            name: "Dev Local",
            email: "dev@rrgpt.internal",
            role: "dev",
          }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role || "user"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.id as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = (token.role as "user" | "admin" | "dev") || "user"
      }
      return session
    },
  },
}

/**
 * Custom session checker for API routes and Server Components
 */
export const auth = () => getServerSession(authOptions)
export default NextAuth(authOptions)
