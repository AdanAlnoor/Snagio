import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { SnagForm } from '@/components/snags/SnagForm'

interface EditSnagPageProps {
  params: {
    projectId: string
    categoryId: string
    snagId: string
  }
}

export default async function EditSnagPage({ params }: EditSnagPageProps) {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch snag with category info
  const snag = await prisma.snag.findFirst({
    where: {
      id: params.snagId,
      categoryId: params.categoryId,
      category: {
        project: {
          id: params.projectId,
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

  // For now, just use the project creator as the only team member
  // In the future, we'll need to implement a proper team management system
  const teamMembers = [{
    id: user.id,
    email: user.email || '',
    firstName: snag.category.project.createdBy?.firstName || '',
    lastName: snag.category.project.createdBy?.lastName || '',
  }]

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
          <Link href={`/projects/${params.projectId}/categories/${params.categoryId}/snags/${params.snagId}`}>
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
          <h1 className="text-3xl font-bold">Edit {projectSettings.itemLabel} #{snag.number}</h1>
        </div>

        <SnagForm
          projectId={params.projectId}
          categoryId={params.categoryId}
          teamMembers={teamMembers}
          settings={projectSettings}
          initialData={{
            location: snag.location,
            description: snag.description,
            solution: snag.solution || undefined,
            priority: snag.priority,
            assignedToId: snag.assignedToId || undefined,
            dueDate: snag.dueDate || undefined,
            photos: snag.photos.map((p: any) => p.id),
          }}
          snagId={snag.id}
        />
      </div>
    </div>
  )
}