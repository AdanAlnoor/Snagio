'use client'

import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  Camera,
  Edit,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Trash,
  User,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'

interface SnagTableProps {
  snags: Array<{
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
    _count?: {
      comments: number
    }
  }>
  projectId: string
  categoryId: string
  settings: any
  onStatusClick?: (snag: any) => void
  onCommentClick?: (snag: any) => void
}

const statusColors = {
  OPEN: 'bg-red-100 text-red-800 border-red-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300',
  CLOSED: 'bg-green-100 text-green-800 border-green-300',
  ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-300',
}

const priorityIcons = {
  LOW: null,
  MEDIUM: <AlertCircle className="h-3 w-3 text-yellow-600" />,
  HIGH: <AlertCircle className="h-3 w-3 text-orange-600" />,
  CRITICAL: <AlertCircle className="h-3 w-3 text-red-600" />,
}

export function SnagTable({ 
  snags, 
  projectId, 
  categoryId, 
  settings,
  onStatusClick,
  onCommentClick
}: SnagTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [snagToDelete, setSnagToDelete] = useState<{ id: string; number: number } | null>(null)

  const handleDeleteClick = (snag: { id: string; number: number }) => {
    setSnagToDelete(snag)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!snagToDelete) return

    setDeletingId(snagToDelete.id)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/categories/${categoryId}/snags/${snagToDelete.id}`,
        {
          method: 'DELETE',
        }
      )

      if (res.ok) {
        router.refresh()
        setDeleteDialogOpen(false)
      } else {
        console.error('Failed to delete snag')
      }
    } catch (error) {
      console.error('Error deleting snag:', error)
    } finally {
      setDeletingId(null)
      setSnagToDelete(null)
    }
  }

  return (
    <div className="space-y-1">
      {/* Table Header */}
      <div className="bg-muted/50 rounded-t-lg border border-b-0 px-4 py-3">
        <div className="flex text-sm font-medium text-muted-foreground">
          <div className="w-[6%] flex-shrink-0 pr-4">{settings.numberLabel || 'No.'}</div>
          <div className="w-[12%] flex-shrink-0 pr-4">{settings.locationLabel || 'Location'}</div>
          <div className="w-[35%] flex-shrink-0 pr-4">{settings.photoLabel || 'Photo'}</div>
          <div className="w-[20%] flex-shrink-0 pr-4">
            {settings.descriptionLabel || 'Description'}
          </div>
          <div className="w-[12%] flex-shrink-0 pr-4">{settings.solutionLabel || 'Solution'}</div>
          <div className="w-[10%] flex-shrink-0 pr-4 text-center">
            {settings.statusLabel || 'Status'}
          </div>
          <div className="w-[5%] flex-shrink-0 text-center">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="border rounded-b-lg overflow-hidden">
        {snags.map((snag, index) => (
          <div
            key={snag.id}
            className={cn(
              'flex p-4 items-start hover:bg-muted/50 transition-colors',
              index !== snags.length - 1 && 'border-b'
            )}
          >
            {/* Number */}
            <div className="w-[6%] flex-shrink-0 pr-4">
              <div className="flex items-center gap-1">
                <span className="font-medium">{snag.number}</span>
                {priorityIcons[snag.priority as keyof typeof priorityIcons]}
              </div>
            </div>

            {/* Location */}
            <div className="w-[12%] flex-shrink-0 pr-4">
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm break-words">{snag.location}</span>
              </div>
            </div>

            {/* Photo - PRIMARY FOCUS */}
            <div className="w-[35%] flex-shrink-0 pr-4">
              <div className="relative group">
                {snag.photos.length > 0 ? (
                  <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
                    <Image
                      src={snag.photos[0].thumbnailUrl || snag.photos[0].url}
                      alt={`${settings.itemLabel} ${snag.number}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 30vw"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="w-[20%] flex-shrink-0 pr-4">
              <p className="text-sm line-clamp-3 break-words">{snag.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {snag.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                      {snag.assignedTo.firstName} {snag.assignedTo.lastName}
                    </span>
                  </div>
                )}
                {snag.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(snag.dueDate), 'MMM d')}
                  </div>
                )}
              </div>
            </div>

            {/* Solution */}
            <div className="w-[12%] flex-shrink-0 pr-4">
              <p className="text-sm text-muted-foreground break-words">{snag.solution || '-'}</p>
            </div>

            {/* Status */}
            <div className="w-[10%] flex-shrink-0 pr-4">
              <Button
                variant="ghost"
                className="p-0 h-auto w-full hover:bg-transparent"
                onClick={() => onStatusClick?.(snag)}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] w-full justify-center px-1 cursor-pointer hover:opacity-80',
                    statusColors[snag.status as keyof typeof statusColors]
                  )}
                >
                  {snag.status === 'IN_PROGRESS' ? 'IN PROG.' : snag.status === 'PENDING_REVIEW' ? 'REVIEW' : snag.status.replace(/_/g, ' ')}
                </Badge>
              </Button>
            </div>

            {/* Actions */}
            <div className="w-[5%] flex-shrink-0 flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => router.push(`/projects/${projectId}/categories/${categoryId}/snags/${snag.id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => onCommentClick?.(snag)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comments
                    {snag._count?.comments ? (
                      <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {snag._count.comments}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(snag)}
                    disabled={deletingId === snag.id}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemType={settings?.itemLabel || 'Snag'}
        itemIdentifier={snagToDelete?.number.toString()}
        isDeleting={deletingId === snagToDelete?.id}
      />
    </div>
  )
}
