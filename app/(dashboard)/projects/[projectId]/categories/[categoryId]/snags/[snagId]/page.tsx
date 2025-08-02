import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2, MessageSquare, Calendar, User } from 'lucide-react'
import { SnagPhotos } from '@/components/snags/SnagPhotos'
import { SnagDetails } from '@/components/snags/SnagDetails'
import { SnagComments } from '@/components/snags/SnagComments'
import { StatusHistory } from '@/components/snags/StatusHistory'
import { format } from 'date-fns'

interface SnagPageProps {
  params: {
    projectId: string
    categoryId: string
    snagId: string
  }
}

export default async function SnagPage({ params }: SnagPageProps) {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch snag with all relations
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
              name: true,
              code: true,
              settings: true,
            },
          },
        },
      },
      photos: {
        orderBy: {
          uploadedAt: 'asc',
        },
      },
      assignedTo: true,
      createdBy: true,
      comments: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      statusHistory: {
        include: {
          changedBy: true,
        },
        orderBy: {
          changedAt: 'desc',
        },
      },
    },
  })

  if (!snag) {
    notFound()
  }

  const projectSettings = snag.category.project.settings || {
    itemLabel: 'Snag',
    photoLabel: 'Photo',
    descriptionLabel: 'Description',
    locationLabel: 'Location',
    statusLabel: 'STATUS',
  }

  const statusColors = {
    OPEN: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PENDING_REVIEW: 'bg-blue-100 text-blue-800',
    CLOSED: 'bg-green-100 text-green-800',
    ON_HOLD: 'bg-gray-100 text-gray-800',
  }

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/projects/${params.projectId}/categories/${params.categoryId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {snag.category.name}
              </Button>
            </Link>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">
                {snag.category.project.name} / {snag.category.project.code} / {snag.category.name}
              </p>
              <h1 className="text-3xl font-bold flex items-center gap-4">
                {projectSettings.itemLabel} #{snag.number}
                <Badge className={statusColors[snag.status as keyof typeof statusColors]}>{snag.status.replace('_', ' ')}</Badge>
                <Badge className={priorityColors[snag.priority]}>{snag.priority}</Badge>
              </h1>
              <p className="text-lg text-muted-foreground mt-2">{snag.location}</p>
            </div>
            <div className="flex gap-3">
              <Link href={`/projects/${params.projectId}/categories/${params.categoryId}/snags/${params.snagId}/edit`}>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content - Photos First */}
          <div className="col-span-2 space-y-6">
            {/* Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle>{projectSettings.photoLabel}s ({snag.photos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <SnagPhotos photos={snag.photos} />
              </CardContent>
            </Card>

            {/* Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <SnagDetails snag={snag} settings={projectSettings} />
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({snag.comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SnagComments snagId={snag.id} comments={snag.comments.map(c => ({...c, createdBy: c.user}))} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created by</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {snag.createdBy.firstName} {snag.createdBy.lastName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(snag.createdAt), 'PPp')}
                  </p>
                </div>

                {snag.assignedTo && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Assigned to</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        {snag.assignedTo.firstName} {snag.assignedTo.lastName}
                      </span>
                    </div>
                  </div>
                )}

                {snag.dueDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Due date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        {format(new Date(snag.dueDate), 'PP')}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status History</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusHistory history={snag.statusHistory} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}