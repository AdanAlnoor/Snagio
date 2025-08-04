import { ArrowLeft, Camera, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExportButton } from '@/components/export/ExportButton'
import { SnagListWrapper } from '@/components/snags/SnagListWrapper'
import { SnagTable } from '@/components/snags/SnagTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

interface CategoryPageProps {
  params: Promise<{
    projectId: string
    categoryId: string
  }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch all data in parallel for better performance
  const ITEMS_PER_PAGE = 50

  const [category, snags, totalSnags, teamMembers] = await Promise.all([
    // Fetch category with project info
    prisma.category.findFirst({
      where: {
        id: resolvedParams.categoryId,
        projectId: resolvedParams.projectId,
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
    }),
    // Fetch snags with optimized query
    prisma.snag.findMany({
      where: {
        categoryId: resolvedParams.categoryId,
      },
      select: {
        id: true,
        number: true,
        location: true,
        description: true,
        solution: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        // Only get the first photo for the list view
        photos: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            caption: true,
          },
          orderBy: {
            uploadedAt: 'asc',
          },
          take: 1,
        },
        // Only get essential assignee info
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        // Just get the comment count, not the actual comments
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        number: 'asc',
      },
      take: ITEMS_PER_PAGE,
    }),
    // Get total count for pagination info
    prisma.snag.count({
      where: {
        categoryId: resolvedParams.categoryId,
      },
    }),
    // Fetch team members for filter
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ])

  if (!category) {
    notFound()
  }

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
      {/* Responsive Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-3">
            {/* Top Row - Back button and Actions */}
            <div className="flex items-center justify-between gap-2">
              <Link href={`/projects/${resolvedParams.projectId}/categories`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>

              <div className="flex gap-2">
                <ExportButton
                  projectId={resolvedParams.projectId}
                  categories={[{ id: category.id, name: category.name }]}
                />
                <Link
                  href={`/projects/${resolvedParams.projectId}/categories/${resolvedParams.categoryId}/snags/new`}
                >
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">New {projectSettings.itemLabel}</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Project and Category Info */}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                {category.project.name} / {category.project.code}
              </div>
              <div className="font-semibold">{category.name}</div>
              {category.description && (
                <div className="text-sm text-muted-foreground">{category.description}</div>
              )}
            </div>

            {/* Stats - Simplified for mobile */}
            <div className="flex items-center gap-4 text-sm">
              <span>
                Total: <span className="font-semibold">{stats.total}</span>
              </span>
              <span>
                Open: <span className="font-semibold text-orange-600">{stats.open}</span>
              </span>
              <span>
                Closed: <span className="font-semibold text-green-600">{stats.closed}</span>
              </span>
            </div>
          </div>

          {/* Desktop Layout - Original */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            {/* Left side - Navigation and Info */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link href={`/projects/${resolvedParams.projectId}/categories`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {category.project.name} / {category.project.code}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold">{category.name}</span>
                {category.description && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{category.description}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right side - Stats and Actions */}
            <div className="flex items-center gap-4">
              {/* Compact Stats */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{stats.total}</span>
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  Open: <span className="font-semibold text-orange-600">{stats.open}</span>
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  Closed: <span className="font-semibold text-green-600">{stats.closed}</span>
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{stats.withPhotos}</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <ExportButton
                  projectId={resolvedParams.projectId}
                  categories={[{ id: category.id, name: category.name }]}
                />
                <Link
                  href={`/projects/${resolvedParams.projectId}/categories/${resolvedParams.categoryId}/snags/new`}
                >
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New {projectSettings.itemLabel}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="sm:container sm:mx-auto sm:p-6">
        {snags.length === 0 ? (
          <Card className="mx-4 sm:mx-0">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {projectSettings.itemLabel}s yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first {projectSettings.itemLabel.toLowerCase()} to get started
              </p>
              <Link
                href={`/projects/${resolvedParams.projectId}/categories/${resolvedParams.categoryId}/snags/new`}
              >
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create {projectSettings.itemLabel}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <SnagListWrapper
            snags={snags as any}
            projectId={resolvedParams.projectId}
            categoryId={resolvedParams.categoryId}
            settings={projectSettings}
            teamMembers={teamMembers}
            totalSnags={totalSnags}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>
    </div>
  )
}
