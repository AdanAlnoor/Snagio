import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSnagSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  solution: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  photos: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
) {
  try {
    const awaitedParams = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    // Fetch snags
    const snags = await prisma.snag.findMany({
      where: {
        categoryId: awaitedParams.categoryId,
      },
      include: {
        photos: {
          orderBy: {
            uploadedAt: 'asc',
          },
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
          },
        },
      },
      orderBy: {
        number: 'asc',
      },
    })

    return NextResponse.json(snags)
  } catch (error) {
    console.error('Error fetching snags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snags' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
) {
  try {
    const awaitedParams = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

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
    const { photos: photoIds, ...snagData } = validatedData

    // Create the snag
    const snag = await prisma.snag.create({
      data: {
        ...snagData,
        number,
        categoryId: awaitedParams.categoryId,
        createdById: user.id,
        status: 'OPEN',
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

    // Create photo records if provided
    if (photoIds && photoIds.length > 0) {
      await prisma.snagPhoto.createMany({
        data: photoIds.map((photoId, index) => ({
          id: photoId,
          snagId: snag.id,
          url: `placeholder-${photoId}`, // These will be updated with actual URLs
          thumbnailUrl: `placeholder-thumb-${photoId}`,
          orderIndex: index,
          uploadedById: user.id,
        })),
      })

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

      return NextResponse.json(snagWithPhotos)
    }

    // Create initial status history
    await prisma.statusHistory.create({
      data: {
        snagId: snag.id,
        fromStatus: 'OPEN',
        toStatus: 'OPEN',
        changedById: user.id,
        reason: 'Initial creation',
      },
    })

    return NextResponse.json(snag)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating snag:', error)
    return NextResponse.json(
      { error: 'Failed to create snag' },
      { status: 500 }
    )
  }
}