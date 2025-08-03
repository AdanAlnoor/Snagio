import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SnagForm } from '@/components/snags/SnagForm'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

export default async function NewSnagPage({
  params,
}: {
  params: Promise<{ projectId: string; categoryId: string }>
}) {
  const resolvedParams = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch category with project for authorization
  const category = await prisma.category.findFirst({
    where: {
      id: resolvedParams.categoryId,
      project: {
        id: resolvedParams.projectId,
        createdById: user.id,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          settings: true,
        },
      },
    },
  })

  if (!category) {
    notFound()
  }

  // Fetch team members for assignment
  const teamMembers = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  const settings = (category.project.settings as any) || {}

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/projects/${resolvedParams.projectId}/categories/${resolvedParams.categoryId}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {category.name}
        </Link>

        <h1 className="text-3xl font-bold">New {settings.itemLabel || 'Snag'}</h1>
        <p className="text-muted-foreground">
          Add a new {(settings.itemLabel || 'snag').toLowerCase()} to {category.name}
        </p>
      </div>

      <SnagForm
        projectId={resolvedParams.projectId}
        categoryId={resolvedParams.categoryId}
        teamMembers={teamMembers}
        settings={settings}
      />
    </div>
  )
}
