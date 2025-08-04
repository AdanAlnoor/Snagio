'use client'

import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  Edit2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Trash,
  User,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface SnagTableInlineProps {
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
    comments: Array<{
      id: string
      content: string
      createdAt: Date
      user: {
        firstName: string | null
        lastName: string | null
        email: string
      }
    }>
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

const getTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return format(date, 'MMM d')
}

export function SnagTableInline({
  snags,
  projectId,
  categoryId,
  settings,
  onStatusClick,
  onCommentClick,
}: SnagTableInlineProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [snagToDelete, setSnagToDelete] = useState<{ id: string; number: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    location: string
    description: string
    solution: string
    status: string
    priority: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleEditClick = (snag: any) => {
    setEditingId(snag.id)
    setEditData({
      location: snag.location,
      description: snag.description,
      solution: snag.solution || '',
      status: snag.status,
      priority: snag.priority,
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editData) return

    setSaving(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/categories/${categoryId}/snags/${editingId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: editData.location,
            description: editData.description,
            solution: editData.solution || null,
            status: editData.status,
            priority: editData.priority,
          }),
        }
      )

      if (response.ok) {
        toast({
          title: 'Changes saved',
          description: 'The snag has been updated successfully.',
        })
        router.refresh()
        setEditingId(null)
        setEditData(null)
      } else {
        throw new Error('Failed to save changes')
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editingId) return

      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSaveEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelEdit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingId, handleCancelEdit, handleSaveEdit])

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
      }
    } catch (_error) {
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
        {snags.map((snag, index) => {
          const isEditing = editingId === snag.id
          const isFirstImage = index === 0 && snag.photos.length > 0

          return (
            <div key={snag.id} className={cn('group', index !== snags.length - 1 && 'border-b')}>
              {/* Main row */}
              <div
                className={cn(
                  'flex p-4 items-start hover:bg-muted/50 transition-colors',
                  isEditing && 'bg-muted/30'
                )}
              >
                {/* Number */}
                <div className="w-[6%] flex-shrink-0 pr-4">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{snag.number}</span>
                    {isEditing ? (
                      <Select
                        value={editData?.priority}
                        onValueChange={value => setEditData({ ...editData!, priority: value })}
                      >
                        <SelectTrigger className="h-6 w-12 p-0 border-0 focus:ring-0">
                          <SelectValue>
                            {priorityIcons[editData?.priority as keyof typeof priorityIcons]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      priorityIcons[snag.priority as keyof typeof priorityIcons]
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="w-[12%] flex-shrink-0 pr-4">
                  {isEditing ? (
                    <Input
                      value={editData?.location}
                      onChange={e => setEditData({ ...editData!, location: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm break-words">{snag.location}</span>
                    </div>
                  )}
                </div>

                {/* Photo - Not editable inline */}
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
                          priority={isFirstImage}
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side content - Description, Solution, Status, Actions */}
                <div className="flex-1 flex">
                  <div className="w-full">
                    {/* Top row - Main content */}
                    <div className="flex">
                      {/* Description */}
                      <div className="w-[42%] flex-shrink-0 pr-4">
                        {isEditing ? (
                          <Textarea
                            value={editData?.description}
                            onChange={e =>
                              setEditData({ ...editData!, description: e.target.value })
                            }
                            className="min-h-[80px] text-sm resize-none"
                          />
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>

                      {/* Solution */}
                      <div className="w-[25%] flex-shrink-0 pr-4">
                        {isEditing ? (
                          <Textarea
                            value={editData?.solution}
                            onChange={e => setEditData({ ...editData!, solution: e.target.value })}
                            placeholder="Enter solution..."
                            className="min-h-[80px] text-sm resize-none"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground break-words">
                            {snag.solution || '-'}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="w-[22%] flex-shrink-0 pr-4">
                        {isEditing ? (
                          <Select
                            value={editData?.status}
                            onValueChange={value => setEditData({ ...editData!, status: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                              <SelectItem value="CLOSED">Closed</SelectItem>
                              <SelectItem value="ON_HOLD">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
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
                              {snag.status === 'IN_PROGRESS'
                                ? 'IN PROG.'
                                : snag.status === 'PENDING_REVIEW'
                                  ? 'REVIEW'
                                  : snag.status.replace(/_/g, ' ')}
                            </Badge>
                          </Button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="w-[11%] flex-shrink-0 flex items-center justify-center">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Save (Ctrl+Enter)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Cancel (Esc)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(snag)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Inline
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => onCommentClick?.(snag)}>
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
                        )}
                      </div>
                    </div>

                    {/* Comments section below main content */}
                    {snag.comments && snag.comments.length > 0 && (
                      <div className="mt-3 border border-purple-200 rounded-md p-2 bg-purple-50/30">
                        <h4 className="text-[11px] font-semibold text-purple-700 mb-1">Comments</h4>
                        <div className="space-y-1">
                          {snag.comments.map(comment => {
                            const author =
                              comment.user.firstName && comment.user.lastName
                                ? `${comment.user.firstName} ${comment.user.lastName}`
                                : comment.user.email.split('@')[0]

                            const timeAgo = getTimeAgo(new Date(comment.createdAt))

                            return (
                              <div
                                key={comment.id}
                                className="text-[10px] text-gray-600 leading-tight"
                              >
                                <span className="font-medium text-gray-700">{author}</span>
                                <span className="mx-0.5 text-gray-400">•</span>
                                <span className="text-[9px] text-gray-500">{timeAgo}</span>
                                <span className="text-gray-400">:</span>
                                <span className="ml-1">{comment.content}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
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
