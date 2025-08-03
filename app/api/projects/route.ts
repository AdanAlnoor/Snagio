import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  clientName: z.string().min(1, 'Client name is required'),
  contractorName: z.string().min(1, 'Contractor name is required'),
  startDate: z.string().transform(str => new Date(str)),
  expectedEndDate: z.string().transform(str => new Date(str)),
})

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        createdById: user.id,
      },
      include: {
        settings: true,
        _count: {
          select: {
            categories: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // Check if project code already exists
    const existingProject = await prisma.project.findUnique({
      where: { code: validatedData.code },
    })

    if (existingProject) {
      return NextResponse.json({ error: 'Project code already exists' }, { status: 400 })
    }

    // Create the project with default settings
    const project = await prisma.project.create({
      data: {
        ...validatedData,
        createdById: user.id,
        settings: {
          create: {
            // Default settings for new projects
            itemLabel: 'Snag',
            numberLabel: 'No.',
            locationLabel: 'Location',
            photoLabel: 'Photo',
            descriptionLabel: 'Description',
            solutionLabel: 'Solution',
            statusLabel: 'STATUS',
          },
        },
      },
      include: {
        settings: true,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }

    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
