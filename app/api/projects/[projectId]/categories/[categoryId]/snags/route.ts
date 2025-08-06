import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

const createSnagSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  solution: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  assignedToId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional(),
  photos: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        thumbnailUrl: z.string(),
      })
    )
    .optional(),
})

export async function GET(
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

    // Get query parameters for pagination and filtering
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor') // For cursor-based pagination
    const page = parseInt(searchParams.get('page') || '1', 10) // Fallback for offset pagination
    const limit = parseInt(searchParams.get('limit') || '25', 10) // Reduced default from 50
    const status = searchParams.get('status')
    const assignedToId = searchParams.get('assignedToId')

    // Validate pagination parameters
    const validatedLimit = Math.min(50, Math.max(1, limit)) // Max 50 items

    // Use cursor-based pagination if cursor is provided
    let skip: number | undefined
    let cursorObj: { id: string } | undefined

    if (cursor) {
      cursorObj = { id: cursor }
    } else {
      // Fallback to offset pagination
      const validatedPage = Math.max(1, page)
      skip = (validatedPage - 1) * validatedLimit
    }

    // Build where clause
    const where: Record<string, string> = {
      categoryId: awaitedParams.categoryId,
    }

    if (status) {
      where.status = status
    }

    if (assignedToId) {
      where.assignedToId = assignedToId
    }

    // Verify user owns the project
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

    // Fetch paginated snags and total count in parallel
    const [snags, total] = await Promise.all([
      prisma.snag.findMany({
        where,
        include: {
          photos: {
            orderBy: {
              uploadedAt: 'asc',
            },
            take: 1, // Only get first photo for list view
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
              photos: true,
            },
          },
        },
        orderBy: [
          { number: 'asc' },
          { id: 'asc' }, // Secondary sort for cursor stability
        ],
        cursor: cursorObj,
        skip: cursor ? 1 : skip, // Skip the cursor itself if using cursor-based pagination
        take: validatedLimit,
      }),
      prisma.snag.count({ where }),
    ])

    // Get the cursor for the next page
    const nextCursor = snags.length === validatedLimit ? snags[snags.length - 1].id : null

    // Generate ETag based on data content
    const dataHash = Buffer.from(JSON.stringify({ snags, total })).toString('base64').slice(0, 32)
    const etag = `"${dataHash}"`

    // Check if client has cached version
    const clientEtag = request.headers.get('if-none-match')
    if (clientEtag === etag) {
      return new NextResponse(null, { status: 304 })
    }

    return NextResponse.json(
      {
        snags,
        pagination: {
          limit: validatedLimit,
          total,
          totalPages: Math.ceil(total / validatedLimit),
          nextCursor,
          // Include page info for backward compatibility
          page: cursor ? undefined : Math.floor((skip || 0) / validatedLimit) + 1,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          ETag: etag,
          'X-Total-Count': total.toString(),
        },
      }
    )
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch snags' }, { status: 500 })
  }
}

export async function POST(
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

    // Verify user owns the project
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

    const body = await request.json()
    const validatedData = createSnagSchema.parse(body)

    // Get the next snag number for this category
    const lastSnag = await prisma.snag.findFirst({
      where: { categoryId: awaitedParams.categoryId },
      orderBy: { number: 'desc' },
    })

    const number = lastSnag ? lastSnag.number + 1 : 1

    // Extract photos from validated data
    const { photos, assignedToId, ...snagData } = validatedData

    // Create the snag
    let snag: any
    try {
      snag = await prisma.snag.create({
        data: {
          ...snagData,
          number,
          categoryId: awaitedParams.categoryId,
          createdById: user.id,
          status: 'OPEN',
          assignedToId: assignedToId || undefined, // Convert null to undefined
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
        },
        include: {
          photos: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      })
    } catch (dbError) {
      throw new Error(
        `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`
      )
    }

    // Create photo records if provided
    if (photos && photos.length > 0) {
      try {
        await prisma.snagPhoto.createMany({
          data: photos.map((photo, index) => ({
            id: photo.id,
            snagId: snag.id,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl,
            orderIndex: index,
            uploadedById: user.id,
          })),
        })
      } catch (photoError) {
        throw new Error(
          `Photo creation error: ${photoError instanceof Error ? photoError.message : 'Unknown photo error'}`
        )
      }

      // Fetch the snag again with photos
      const snagWithPhotos = await prisma.snag.findUnique({
        where: { id: snag.id },
        include: {
          photos: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      })

      // Create initial status history
      try {
        await prisma.statusHistory.create({
          data: {
            snagId: snag.id,
            fromStatus: 'OPEN',
            toStatus: 'OPEN',
            changedById: user.id,
            reason: 'Initial creation',
          },
        })
      } catch (_statusError) {
        // Don't throw here, as the snag is already created
      }

      return NextResponse.json(snagWithPhotos)
    }

    // Create initial status history for snags without photos
    try {
      await prisma.statusHistory.create({
        data: {
          snagId: snag.id,
          fromStatus: 'OPEN',
          toStatus: 'OPEN',
          changedById: user.id,
          reason: 'Initial creation',
        },
      })
    } catch (_statusError) {
      // Don't throw here, as the snag is already created
    }

    return NextResponse.json(snag)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create snag' }, { status: 500 })
  }
}
