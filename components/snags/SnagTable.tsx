'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Camera,
  MapPin,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

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
  }>
  projectId: string
  categoryId: string
  settings: any
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

export function SnagTable({ snags, projectId, categoryId, settings }: SnagTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (snagId: string) => {
    if (!confirm(`Delete this ${settings.itemLabel}?`)) return

    setDeletingId(snagId)
    try {
      const res = await fetch(`/api/projects/${projectId}/categories/${categoryId}/snags/${snagId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.refresh()
      } else {
        console.error('Failed to delete snag')
      }
    } catch (error) {
      console.error('Error deleting snag:', error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-1">
      {/* Table Header */}
      <div className="bg-muted/50 rounded-t-lg border border-b-0 px-4 py-3">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-1">{settings.numberLabel || 'No.'}</div>
          <div className="col-span-3">{settings.photoLabel || 'Photo'}</div>
          <div className="col-span-2">{settings.locationLabel || 'Location'}</div>
          <div className="col-span-4">{settings.descriptionLabel || 'Description'}</div>
          <div className="col-span-1 text-center">{settings.statusLabel || 'STATUS'}</div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {/* Table Body */}
      <div className="border rounded-b-lg overflow-hidden">
        {snags.map((snag, index) => (
          <div
            key={snag.id}
            className={cn(
              "grid grid-cols-12 gap-4 p-4 items-start hover:bg-muted/50 transition-colors",
              index !== snags.length - 1 && "border-b"
            )}
          >
            {/* Number */}
            <div className="col-span-1">
              <div className="flex items-center gap-1">
                <span className="font-medium">{snag.number}</span>
                {priorityIcons[snag.priority as keyof typeof priorityIcons]}
              </div>
            </div>

            {/* Photo - PRIMARY FOCUS */}
            <div className="col-span-3">
              <Link href={`/projects/${projectId}/categories/${categoryId}/snags/${snag.id}`}>
                <div className="relative group cursor-pointer">
                  {snag.photos.length > 0 ? (
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
                      <Image
                        src={snag.photos[0].thumbnailUrl || snag.photos[0].url}
                        alt={`${settings.itemLabel} ${snag.number}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="(max-width: 768px) 100vw, 275px"
                      />
                      {snag.photos.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                          +{snag.photos.length - 1} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* Location */}
            <div className="col-span-2">
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                <span className="text-sm">{snag.location}</span>
              </div>
            </div>

            {/* Description */}
            <div className="col-span-4">
              <p className="text-sm line-clamp-3">{snag.description}</p>
              {snag.solution && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  Solution: {snag.solution}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {snag.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {snag.assignedTo.firstName} {snag.assignedTo.lastName}
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

            {/* Status */}
            <div className="col-span-1 flex justify-center">
              <Badge 
                variant="outline" 
                className={cn("text-xs", statusColors[snag.status as keyof typeof statusColors])}
              >
                {snag.status.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    disabled={deletingId === snag.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/projects/${projectId}/categories/${categoryId}/snags/${snag.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(snag.id)}
                    className="text-destructive"
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
    </div>
  )
}