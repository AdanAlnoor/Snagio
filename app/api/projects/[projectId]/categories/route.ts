import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().optional().default('FolderOpen'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: awaitedParams.projectId,
        createdById: user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch categories with snag counts
    const categories = await prisma.category.findMany({
      where: {
        projectId: awaitedParams.projectId,
      },
      include: {
        _count: {
          select: {
            snags: true,
          },
        },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    })

    // Get open/closed counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async category => {
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

        return {
          ...category,
          openSnagCount: openCount,
          closedSnagCount: closedCount,
        }
      })
    )

    return NextResponse.json(categoriesWithCounts)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: awaitedParams.projectId,
        createdById: user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = createCategorySchema.parse(body)

    // Get the highest orderIndex
    const lastCategory = await prisma.category.findFirst({
      where: { projectId: awaitedParams.projectId },
      orderBy: { orderIndex: 'desc' },
    })

    const orderIndex = lastCategory ? lastCategory.orderIndex + 1 : 0

    // Generate a code from the category name
    const code = validatedData.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 10)

    // Create the category
    const category = await prisma.category.create({
      data: {
        ...validatedData,
        code,
        projectId: awaitedParams.projectId,
        orderIndex,
      },
      include: {
        _count: {
          select: {
            snags: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...category,
      openSnagCount: 0,
      closedSnagCount: 0,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }

    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
