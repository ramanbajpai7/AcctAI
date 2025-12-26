import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "development-secret-change-in-production",
  trustHost: true, // Required for Vercel deployments
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
          
          console.log('Auth: Verifying credentials at', baseUrl)
          
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
            console.log('Auth: User verified successfully:', user?.email)
            return user
          }
          console.log('Auth: Verification failed, status:', response.status)
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
    async signIn({ user, account, profile }) {
      // For Google OAuth, create or update the user in our database
      if (account?.provider === "google" && profile?.email) {
        try {
          let baseUrl = 'http://localhost:3000'
          if (process.env.NEXTAUTH_URL) {
            baseUrl = process.env.NEXTAUTH_URL
          } else if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`
          }
          
          // Create or update user via API
          const response = await fetch(`${baseUrl}/api/auth/oauth-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name || profile.email.split('@')[0],
              image: (profile as any).picture,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }),
          })
          
          if (response.ok) {
            const dbUser = await response.json()
            // Attach the database user id to the user object
            user.id = dbUser.id
            ;(user as any).role = dbUser.role
            ;(user as any).firm = dbUser.firm
          }
        } catch (error) {
          console.error("OAuth signIn callback error:", error)
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || "accountant"
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

