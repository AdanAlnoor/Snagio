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

    // Check if middleware already verified auth
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      // Fallback to Supabase auth check if middleware didn't verify
      const supabase = await createServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return handleGetCategories(awaitedParams.projectId, user.id, request)
    }

    return handleGetCategories(awaitedParams.projectId, userId, request)
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

async function handleGetCategories(projectId: string, userId: string, request: NextRequest) {
  // Verify user owns the project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: userId,
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Fetch categories with snag counts
  const categories = await prisma.category.findMany({
    where: {
      projectId: projectId,
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

  // Get all snag counts in a single query
  const snagCounts = await prisma.snag.groupBy({
    by: ['categoryId', 'status'],
    where: {
      categoryId: {
        in: categories.map(c => c.id),
      },
    },
    _count: {
      _all: true,
    },
  })

  // Create a map for quick lookup
  const countsMap = new Map<string, { open: number; closed: number }>()

  // Initialize all categories with zero counts
  categories.forEach(cat => {
    countsMap.set(cat.id, { open: 0, closed: 0 })
  })

  // Populate counts from the grouped query
  snagCounts.forEach(({ categoryId, status, _count }) => {
    const counts = countsMap.get(categoryId)
    if (counts) {
      if (['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(status)) {
        counts.open += _count._all
      } else if (status === 'CLOSED') {
        counts.closed += _count._all
      }
    }
  })

  // Map categories with their counts
  const categoriesWithCounts = categories.map(category => {
    const counts = countsMap.get(category.id) || { open: 0, closed: 0 }
    return {
      ...category,
      openSnagCount: counts.open,
      closedSnagCount: counts.closed,
    }
  })

  // Generate ETag for caching
  const dataHash = Buffer.from(JSON.stringify(categoriesWithCounts)).toString('base64').slice(0, 32)
  const etag = `"${dataHash}"`

  // Check if client has cached version
  const clientEtag = request.headers.get('if-none-match')
  if (clientEtag === etag) {
    return new NextResponse(null, { status: 304 })
  }

  return NextResponse.json(categoriesWithCounts, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      ETag: etag,
    },
  })
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
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
