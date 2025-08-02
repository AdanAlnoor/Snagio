'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  FolderOpen,
  Image,
  Clock,
  CheckCircle2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CategoryCardProps {
  category: {
    id: string
    name: string
    description?: string
    color: string
    icon: string
    orderIndex: number
    _count: {
      snags: number
    }
    openSnagCount: number
    closedSnagCount: number
    createdAt: string
    updatedAt: string
  }
  projectId: string
  itemLabel: string
  onUpdate: () => void
}

const iconMap: { [key: string]: React.ElementType } = {
  FolderOpen,
  // Add more icons as needed
}

export function CategoryCard({ category, projectId, itemLabel, onUpdate }: CategoryCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  
  const IconComponent = iconMap[category.icon] || FolderOpen

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all ${itemLabel.toLowerCase()}s in this category.`)) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/projects/${projectId}/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      onUpdate()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  const completionRate = category._count.snags > 0 
    ? Math.round((category.closedSnagCount / category._count.snags) * 100)
    : 0

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: category.color + '20' }}
            >
              <IconComponent 
                className="h-6 w-6" 
                style={{ color: category.color }}
              />
            </div>
            <div>
              <CardTitle className="text-lg">{category.name}</CardTitle>
              {category.description && (
                <CardDescription className="mt-1">
                  {category.description}
                </CardDescription>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={deleting}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/projects/${projectId}/categories/${category.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Image className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="font-medium">{category._count.snags}</span>
              <span className="text-gray-500">total</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{category.openSnagCount}</span>
              <span className="text-gray-500">open</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">{category.closedSnagCount}</span>
              <span className="text-gray-500">closed</span>
            </div>
          </div>

          {/* Progress Bar */}
          {category._count.snags > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completion</span>
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

          {/* View Button */}
          <Link href={`/projects/${projectId}/categories/${category.id}/snags`}>
            <Button className="w-full" variant="outline">
              View {itemLabel}s
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}