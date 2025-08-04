import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const createUserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createUserProfileSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: validatedData.id },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'User profile already exists',
          user: existingUser,
        },
        { status: 409 }
      )
    }

    // Create the user profile
    const user = await prisma.user.create({
      data: {
        id: validatedData.id,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        company: validatedData.company,
        role: 'INSPECTOR', // Default role for new users
      },
    })

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      const field = error.message.includes('email') ? 'email' : 'id'
      return NextResponse.json(
        {
          error: `User with this ${field} already exists`,
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to create user profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
