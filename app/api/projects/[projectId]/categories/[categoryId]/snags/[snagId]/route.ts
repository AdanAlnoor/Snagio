import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

const updateSnagSchema = z.object({
  location: z.string().min(1, 'Location is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  solution: z.string().nullable().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
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
  { params }: { params: Promise<{ projectId: string; categoryId: string; snagId: string }> }
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

    // Fetch snag with authorization check
    const snag = await prisma.snag.findFirst({
      where: {
        id: awaitedParams.snagId,
        category: {
          id: awaitedParams.categoryId,
          project: {
            id: awaitedParams.projectId,
            createdById: user.id,
          },
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    })

    if (!snag) {
      return NextResponse.json({ error: 'Snag not found' }, { status: 404 })
    }

    return NextResponse.json(snag)
  } catch (error) {
    console.error('Error fetching snag:', error)
    return NextResponse.json({ error: 'Failed to fetch snag' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string; snagId: string }> }
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
    const existingSnag = await prisma.snag.findFirst({
      where: {
        id: awaitedParams.snagId,
        category: {
          id: awaitedParams.categoryId,
          project: {
            id: awaitedParams.projectId,
            createdById: user.id,
          },
        },
      },
    })

    if (!existingSnag) {
      return NextResponse.json({ error: 'Snag not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateSnagSchema.parse(body)

    // Extract photos from validated data
    const { photos, assignedToId, ...snagData } = validatedData

    // Handle status change history
    if (validatedData.status && validatedData.status !== existingSnag.status) {
      await prisma.statusHistory.create({
        data: {
          snagId: awaitedParams.snagId,
          fromStatus: existingSnag.status,
          toStatus: validatedData.status,
          changedById: user.id,
          reason: body.statusChangeReason,
        },
      })
    }

    // Update the snag
    const updatedSnag = await prisma.snag.update({
      where: { id: awaitedParams.snagId },
      data: {
        ...snagData,
        assignedToId: assignedToId || undefined,
        dueDate: snagData.dueDate ? new Date(snagData.dueDate) : null,
        completedDate: snagData.status === 'CLOSED' ? new Date() : existingSnag.completedDate,
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

    // Update photos if provided
    if (photos !== undefined) {
      // Get existing photo IDs
      const existingPhotoIds = updatedSnag.photos.map(p => p.id)
      const newPhotoIds = photos.map(p => p.id)

      // Remove existing photos not in the new list
      await prisma.snagPhoto.deleteMany({
        where: {
          snagId: awaitedParams.snagId,
          id: {
            notIn: newPhotoIds,
          },
        },
      })

      // Add new photos
      const photosToAdd = photos.filter(p => !existingPhotoIds.includes(p.id))

      if (photosToAdd.length > 0) {
        await prisma.snagPhoto.createMany({
          data: photosToAdd.map((photo, index) => ({
            id: photo.id,
            snagId: awaitedParams.snagId,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl,
            orderIndex: existingPhotoIds.length + index,
            uploadedById: user.id,
          })),
        })
      }

      // Fetch the updated snag with photos
      const finalSnag = await prisma.snag.findUnique({
        where: { id: awaitedParams.snagId },
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
      return NextResponse.json(finalSnag)
    }

    return NextResponse.json(updatedSnag)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }

    console.error('Error updating snag:', error)
    return NextResponse.json({ error: 'Failed to update snag' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string; snagId: string }> }
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

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async tx => {
      // Verify user owns the project and get the snag number
      const snag = await tx.snag.findFirst({
        where: {
          id: awaitedParams.snagId,
          category: {
            id: awaitedParams.categoryId,
            project: {
              id: awaitedParams.projectId,
              createdById: user.id,
            },
          },
        },
        select: {
          id: true,
          number: true,
          categoryId: true,
        },
      })

      if (!snag) {
        throw new Error('Snag not found')
      }

      // Delete the snag (cascade will handle related records)
      await tx.snag.delete({
        where: { id: awaitedParams.snagId },
      })

      // Get all snags with higher numbers in the same category
      const snagsToRenumber = await tx.snag.findMany({
        where: {
          categoryId: snag.categoryId,
          number: {
            gt: snag.number,
          },
        },
        orderBy: {
          number: 'desc', // Order descending to avoid unique constraint violations
        },
        select: {
          id: true,
          number: true,
        },
      })

      // Update each snag's number
      for (const snagToUpdate of snagsToRenumber) {
        await tx.snag.update({
          where: { id: snagToUpdate.id },
          data: { number: snagToUpdate.number - 1 },
        })
      }

      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting snag:', error)
    if (error instanceof Error && error.message === 'Snag not found') {
      return NextResponse.json({ error: 'Snag not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete snag' }, { status: 500 })
  }
}
