'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CategoryTemplate {
  name: string
  description: string
  color: string
  icon: string
}

const templates: CategoryTemplate[] = [
  {
    name: 'Entrance',
    description: 'Main entrance and lobby areas',
    color: '#3B82F6',
    icon: 'Home',
  },
  {
    name: 'Kitchen',
    description: 'Kitchen and dining areas',
    color: '#EF4444',
    icon: 'PaintBucket',
  },
  {
    name: 'Living Areas',
    description: 'Living rooms and common spaces',
    color: '#10B981',
    icon: 'Home',
  },
  { name: 'Bedrooms', description: 'Master and guest bedrooms', color: '#8B5CF6', icon: 'Home' },
  {
    name: 'Bathrooms',
    description: 'Bathrooms and powder rooms',
    color: '#06B6D4',
    icon: 'PaintBucket',
  },
  {
    name: 'Exterior',
    description: 'Facade, garden, and outdoor areas',
    color: '#F59E0B',
    icon: 'Home',
  },
  {
    name: 'MEP',
    description: 'Mechanical, Electrical, Plumbing',
    color: '#6366F1',
    icon: 'Wrench',
  },
  {
    name: 'HVAC',
    description: 'Heating, Ventilation, Air Conditioning',
    color: '#84CC16',
    icon: 'Zap',
  },
  { name: 'Safety', description: 'Safety and security systems', color: '#DC2626', icon: 'Shield' },
  { name: 'Storage', description: 'Storage rooms and closets', color: '#7C3AED', icon: 'Package' },
]

const colorOptions = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
]

export default function NewCategoryPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'FolderOpen',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create category')
      }

      router.push(`/projects/${projectId}/categories`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = (template: CategoryTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      color: template.color,
      icon: template.icon,
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link
        href={`/projects/${projectId}/categories`}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to categories
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">New Category</h1>
        <p className="text-gray-600">Create a category to organize your inspections</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>Select a template to quickly set up common categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {templates.map(template => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template)}
                disabled={loading}
                className="justify-start"
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: template.color }}
                />
                {template.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Category Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Kitchen, Exterior, MEP"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this category includes"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                      formData.color === color
                        ? 'border-gray-900 scale-110'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>

          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/categories`)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Category'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
