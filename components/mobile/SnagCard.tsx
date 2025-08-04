'use client'

import { format } from 'date-fns'
import { Calendar, MapPin, MessageSquare, MoreVertical, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SnagCardProps {
  snag: {
    id: string
    number: number
    location: string
    description: string
    solution: string | null
    status: string
    priority: string
    dueDate: Date | null
    createdAt: Date
    photos: Array<{
      id: string
      url: string
      thumbnailUrl: string
      caption: string | null
    }>
    assignedTo: {
      firstName: string
      lastName: string
    } | null
    _count: {
      comments: number
    }
  }
  projectId: string
  categoryId: string
  onDelete?: () => void
  onStatusChange?: () => void
}

const statusColors = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-green-100 text-green-800',
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-red-100 text-red-800',
  URGENT: 'bg-red-200 text-red-900',
}

export function SnagCard({ snag, projectId, categoryId, onDelete, onStatusChange }: SnagCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/snags/${snag.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete snag')
      }

      onDelete?.()
    } catch (_error) {}
  }

  return (
    <>
      <Card className="overflow-hidden">
        {/* Photo Section */}
        {snag.photos.length > 0 && (
          <Link href={`/projects/${projectId}/categories/${categoryId}/snags/${snag.id}`}>
            <div className="relative aspect-[4/3] bg-gray-100">
              <Image
                src={snag.photos[0].thumbnailUrl || snag.photos[0].url}
                alt={`Snag #${snag.number}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
                priority={snag.number === 1}
              />
              {snag.photos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  +{snag.photos.length - 1} more
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <Link
                href={`/projects/${projectId}/categories/${categoryId}/snags/${snag.id}`}
                className="font-semibold text-lg hover:underline"
              >
                Snag #{snag.number}
              </Link>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{snag.location}</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/projects/${projectId}/categories/${categoryId}/snags/${snag.id}/edit`}
                  >
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          <p className="text-sm line-clamp-2">{snag.description}</p>

          {/* Status and Priority */}
          <div className="flex items-center gap-2">
            <Badge
              className={cn('text-xs', statusColors[snag.status as keyof typeof statusColors])}
            >
              {snag.status.replace('_', ' ')}
            </Badge>
            <Badge
              className={cn(
                'text-xs',
                priorityColors[snag.priority as keyof typeof priorityColors]
              )}
            >
              {snag.priority}
            </Badge>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            {/* Assignee */}
            {snag.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>
                  {snag.assignedTo.firstName} {snag.assignedTo.lastName}
                </span>
              </div>
            )}

            {/* Due Date */}
            {snag.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(snag.dueDate), 'MMM d')}</span>
              </div>
            )}

            {/* Comments */}
            {snag._count.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{snag._count.comments}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        itemType="Snag"
        itemIdentifier={`#${snag.number}`}
      />
    </>
  )
}
