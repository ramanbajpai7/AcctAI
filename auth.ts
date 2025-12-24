import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "development-secret-change-in-production",
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Use internal API to verify credentials (avoids edge runtime issues)
          let baseUrl = 'http://localhost:3000'
          if (process.env.NEXTAUTH_URL) {
            baseUrl = process.env.NEXTAUTH_URL
          } else if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`
          }
          
          const response = await fetch(`${baseUrl}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })
          
          if (response.ok) {
            const user = await response.json()
            return user
          }
        } catch (error) {
          console.error("Auth error:", error)
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.firm = (user as any).firm
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).firm = token.firm
      }
      return session
    },
  },
})

