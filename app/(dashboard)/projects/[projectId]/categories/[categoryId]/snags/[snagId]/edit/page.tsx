import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SnagForm } from '@/components/snags/SnagForm'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

interface EditSnagPageProps {
  params: Promise<{
    projectId: string
    categoryId: string
    snagId: string
  }>
}

export default async function EditSnagPage({ params }: EditSnagPageProps) {
  const resolvedParams = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch snag with category info
  const snag = await prisma.snag.findFirst({
    where: {
      id: resolvedParams.snagId,
      categoryId: resolvedParams.categoryId,
      category: {
        project: {
          id: resolvedParams.projectId,
          createdById: user.id,
        },
      },
    },
    include: {
      category: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              settings: true,
              createdBy: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      photos: {
        orderBy: {
          uploadedAt: 'asc',
        },
      },
    },
  })

  if (!snag) {
    notFound()
  }

  // Fetch team members
  const teamMembers = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  const projectSettings = snag.category.project.settings || {
    itemLabel: 'Snag',
    photoLabel: 'Photo',
    descriptionLabel: 'Description',
    locationLabel: 'Location',
    statusLabel: 'STATUS',
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/projects/${resolvedParams.projectId}/categories/${resolvedParams.categoryId}/snags/${resolvedParams.snagId}`}
          >
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {projectSettings.itemLabel}
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <p className="text-sm text-muted-foreground">
            {snag.category.project.name} / {snag.category.project.code} / {snag.category.name}
          </p>
          <h1 className="text-3xl font-bold">
            Edit {projectSettings.itemLabel} #{snag.number}
          </h1>
        </div>

        <SnagForm
          projectId={resolvedParams.projectId}
          categoryId={resolvedParams.categoryId}
          teamMembers={teamMembers}
          settings={projectSettings}
          initialData={{
            location: snag.location,
            description: snag.description,
            solution: snag.solution || '',
            priority: snag.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            assignedToId: snag.assignedToId || '',
            dueDate: snag.dueDate || undefined,
          }}
          snagId={snag.id}
        />
      </div>
    </div>
  )
}
