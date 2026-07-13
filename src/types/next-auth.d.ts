import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "user" | "admin" | "dev"
    } & DefaultSession["user"]
  }

  interface User {
    role?: "user" | "admin" | "dev"
  }
}
