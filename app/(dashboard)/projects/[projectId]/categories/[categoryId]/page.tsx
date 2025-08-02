import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Camera, FileText, ArrowLeft } from 'lucide-react'
import { SnagTable } from '@/components/snags/SnagTable'

interface CategoryPageProps {
  params: {
    projectId: string
    categoryId: string
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch category with project info
  const category = await prisma.category.findFirst({
    where: {
      id: params.categoryId,
      project: {
        id: params.projectId,
        createdById: user.id,
      },
    },
    include: {
      project: {
        select: {
          name: true,
          code: true,
          settings: true,
        },
      },
      _count: {
        select: {
          snags: true,
        },
      },
    },
  })

  if (!category) {
    notFound()
  }

  // Fetch snags with photos
  const snags = await prisma.snag.findMany({
    where: {
      categoryId: params.categoryId,
    },
    include: {
      photos: {
        orderBy: {
          uploadedAt: 'asc',
        },
        take: 1, // Get primary photo for table view
      },
      assignedTo: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      number: 'asc',
    },
  })

  // Get stats
  const stats = {
    total: snags.length,
    open: snags.filter(s => ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(s.status)).length,
    closed: snags.filter(s => s.status === 'CLOSED').length,
    withPhotos: snags.filter(s => s.photos.length > 0).length,
  }

  const projectSettings = category.project.settings || {
    itemLabel: 'Snag',
    photoLabel: 'Photo',
    descriptionLabel: 'Description',
    locationLabel: 'Location',
    statusLabel: 'STATUS',
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/projects/${params.projectId}/categories`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Categories
              </Button>
            </Link>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">
                {category.project.name} / {category.project.code}
              </p>
              <h1 className="text-3xl font-bold">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground mt-2">{category.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Link href={`/projects/${params.projectId}/categories/${params.categoryId}/snags/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New {projectSettings.itemLabel}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total {projectSettings.itemLabel}s
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Closed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <Camera className="h-4 w-4 inline mr-1" />
                  With Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.withPhotos}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        {snags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {projectSettings.itemLabel}s yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first {projectSettings.itemLabel.toLowerCase()} to get started
              </p>
              <Link href={`/projects/${params.projectId}/categories/${params.categoryId}/snags/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create {projectSettings.itemLabel}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <SnagTable
            snags={snags}
            projectId={params.projectId}
            categoryId={params.categoryId}
            settings={projectSettings}
          />
        )}
      </div>
    </div>
  )
}