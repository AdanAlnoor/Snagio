'use client'

import { CheckCircle2, Clock, Edit, FolderOpen, Image, MoreVertical, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CategoryListProps {
  categories: Array<{
    id: string
    name: string
    description?: string | null
    color: string
    icon: string
    orderIndex: number
    _count: {
      snags: number
    }
    openSnagCount: number
    closedSnagCount: number
    createdAt: string | Date
    updatedAt: string | Date
  }>
  projectId: string
  itemLabel: string
}

const iconMap: { [key: string]: React.ElementType } = {
  FolderOpen,
  // Add more icons as needed
}

export function CategoryList({ categories, projectId, itemLabel }: CategoryListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? This will also delete all ${itemLabel.toLowerCase()}s in this category.`
      )
    ) {
      return
    }

    try {
      setDeletingId(categoryId)
      const response = await fetch(`/api/projects/${projectId}/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      router.refresh()
    } catch (_error) {
      alert('Failed to delete category')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-2">
      {/* Desktop view - table-like layout */}
      <div className="hidden md:block rounded-lg border bg-card">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
          <div className="col-span-5">Category</div>
          <div className="col-span-1 text-center">Total</div>
          <div className="col-span-1 text-center">Open</div>
          <div className="col-span-1 text-center">Closed</div>
          <div className="col-span-2 text-center">Completion</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Rows */}
        {categories.map((category) => {
          const IconComponent = iconMap[category.icon] || FolderOpen
          const completionRate =
            category._count.snags > 0
              ? Math.round((category.closedSnagCount / category._count.snags) * 100)
              : 0

          return (
            <div
              key={category.id}
              className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/projects/${projectId}/categories/${category.id}`)}
            >
              {/* Category name and description */}
              <div className="col-span-5 flex items-center gap-3">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{category.name}</div>
                  {category.description && (
                    <div className="text-sm text-muted-foreground truncate">
                      {category.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Total count */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="flex items-center gap-1 text-sm">
                  <Image className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">{category._count.snags}</span>
                </div>
              </div>

              {/* Open count */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{category.openSnagCount}</span>
                </div>
              </div>

              {/* Closed count */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="flex items-center gap-1 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{category.closedSnagCount}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="col-span-2 flex items-center">
                {category._count.snags > 0 ? (
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{completionRate}%</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No {itemLabel.toLowerCase()}s</span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === category.id}
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/projects/${projectId}/categories/${category.id}/edit`)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(category.id, category.name)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile view - card-like layout */}
      <div className="md:hidden space-y-3">
        {categories.map((category) => {
          const IconComponent = iconMap[category.icon] || FolderOpen
          const completionRate =
            category._count.snags > 0
              ? Math.round((category.closedSnagCount / category._count.snags) * 100)
              : 0

          return (
            <div 
              key={category.id} 
              className="rounded-lg border bg-card p-4 space-y-3 cursor-pointer hover:bg-muted/10 transition-colors"
              onClick={() => router.push(`/projects/${projectId}/categories/${category.id}`)}
            >
              {/* Header with icon and name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-sm text-muted-foreground">{category.description}</div>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === category.id}
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/projects/${projectId}/categories/${category.id}/edit`)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(category.id, category.name)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Image className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">{category._count.snags}</span>
                  <span className="text-muted-foreground">total</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{category.openSnagCount}</span>
                  <span className="text-muted-foreground">open</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{category.closedSnagCount}</span>
                  <span className="text-muted-foreground">closed</span>
                </div>
              </div>

              {/* Progress */}
              {category._count.snags > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}