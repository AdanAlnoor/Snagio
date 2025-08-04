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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const status = searchParams.get('status')
    const assignedToId = searchParams.get('assignedToId')

    // Validate pagination parameters
    const validatedPage = Math.max(1, page)
    const validatedLimit = Math.min(100, Math.max(1, limit))
    const skip = (validatedPage - 1) * validatedLimit

    // Build where clause
    const where: any = {
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
        orderBy: {
          number: 'asc',
        },
        skip,
        take: validatedLimit,
      }),
      prisma.snag.count({ where }),
    ])

    return NextResponse.json({
      snags,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages: Math.ceil(total / validatedLimit),
      },
    })
  } catch (error) {
    console.error('Error fetching snags:', error)
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
    let snag
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
      console.error('Database error creating snag:', dbError)
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
        console.error('Database error creating photos:', photoError)
        console.error('Photo data:', photos)
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
      } catch (statusError) {
        console.error('Error creating status history:', statusError)
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
    } catch (statusError) {
      console.error('Error creating status history:', statusError)
      // Don't throw here, as the snag is already created
    }

    return NextResponse.json(snag)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }

    console.error('Error creating snag:', error)
    return NextResponse.json({ error: 'Failed to create snag' }, { status: 500 })
  }
}
