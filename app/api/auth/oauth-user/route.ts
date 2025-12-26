import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// API route to handle OAuth user creation/update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, image, provider, providerAccountId } = body

    if (!email || !provider || !providerAccountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (user) {
      // Update existing user if they didn't have an image
      if (!user.image && image) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { image },
        })
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name,
          image,
          role: "accountant", // Default role for new OAuth users
        },
      })
    }

    // Check if account link exists, create if not
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    })

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider,
          providerAccountId,
        },
      })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      firm: user.firm,
      image: user.image,
    })
  } catch (error) {
    console.error("OAuth user creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
