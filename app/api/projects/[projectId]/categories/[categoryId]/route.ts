import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  icon: z.string().optional(),
  orderIndex: z.number().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
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

    const category = await prisma.category.findFirst({
      where: {
        id: awaitedParams.categoryId,
        project: {
          id: awaitedParams.projectId,
          createdById: user.id,
        },
      },
      include: {
        _count: {
          select: {
            snags: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Get open/closed counts
    const [openCount, closedCount] = await Promise.all([
      prisma.snag.count({
        where: {
          categoryId: category.id,
          status: {
            in: ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW'],
          },
        },
      }),
      prisma.snag.count({
        where: {
          categoryId: category.id,
          status: 'CLOSED',
        },
      }),
    ])

    return NextResponse.json({
      ...category,
      openSnagCount: openCount,
      closedSnagCount: closedCount,
    })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
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

    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    // Verify user owns the category
    const category = await prisma.category.findFirst({
      where: {
        id: awaitedParams.categoryId,
        project: {
          id: awaitedParams.projectId,
          createdById: user.id,
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const updatedCategory = await prisma.category.update({
      where: { id: awaitedParams.categoryId },
      data: validatedData,
      include: {
        _count: {
          select: {
            snags: true,
          },
        },
      },
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
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

    // Verify user owns the category
    const category = await prisma.category.findFirst({
      where: {
        id: awaitedParams.categoryId,
        project: {
          id: awaitedParams.projectId,
          createdById: user.id,
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Delete the category (cascade will delete related snags)
    await prisma.category.delete({
      where: { id: awaitedParams.categoryId },
    })

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
