import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ snagId: string }> }
) {
  try {
    const awaitedParams = await params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to the snag
    const snag = await prisma.snag.findFirst({
      where: {
        id: awaitedParams.snagId,
        category: {
          project: {
            createdById: user.id,
          },
        },
      },
    })

    if (!snag) {
      return NextResponse.json({ error: 'Snag not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = createCommentSchema.parse(body)

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        snagId: awaitedParams.snagId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Transform to match expected format
    const transformedComment = {
      ...comment,
      createdBy: comment.user,
    }

    return NextResponse.json(transformedComment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }

    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
