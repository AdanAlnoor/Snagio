import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

const updateSettingsSchema = z.object({
  itemLabel: z.string().min(1),
  numberLabel: z.string().min(1),
  locationLabel: z.string().min(1),
  photoLabel: z.string().min(1),
  descriptionLabel: z.string().min(1),
  solutionLabel: z.string().min(1),
  statusLabel: z.string().min(1),
  photoSize: z.enum(['SMALL', 'MEDIUM', 'LARGE']),
  rowsPerPage: z.number().min(3).max(10),
  customStatuses: z.any().optional(),
})

export async function PUT(
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

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: awaitedParams.projectId,
        createdById: user.id,
      },
      include: {
        settings: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update or create settings
    const settings = await prisma.projectSettings.upsert({
      where: {
        projectId: awaitedParams.projectId,
      },
      update: validatedData,
      create: {
        ...validatedData,
        projectId: awaitedParams.projectId,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }

    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
