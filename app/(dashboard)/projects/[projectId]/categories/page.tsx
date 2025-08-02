'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, FolderOpen, Image, Clock, CheckCircle2 } from 'lucide-react'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { ExportButton } from '@/components/export/ExportButton'

interface Category {
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

interface Project {
  id: string
  name: string
  code: string
  settings?: {
    itemLabel: string
  }
}

export default function CategoriesPage({
  params,
}: {
  params: { projectId: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [params.projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${params.projectId}`)
      if (!projectResponse.ok) throw new Error('Failed to fetch project')
      const projectData = await projectResponse.json()
      setProject(projectData)
      
      // Fetch categories
      const categoriesResponse = await fetch(`/api/projects/${params.projectId}/categories`)
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories')
      const categoriesData = await categoriesResponse.json()
      setCategories(categoriesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getTotalStats = () => {
    const totalSnags = categories.reduce((sum, cat) => sum + cat._count.snags, 0)
    const openSnags = categories.reduce((sum, cat) => sum + cat.openSnagCount, 0)
    const closedSnags = categories.reduce((sum, cat) => sum + cat.closedSnagCount, 0)
    return { totalSnags, openSnags, closedSnags }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  const { totalSnags, openSnags, closedSnags } = getTotalStats()
  const itemLabel = project?.settings?.itemLabel || 'Snag'

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link 
          href="/projects" 
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to projects
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{project?.name}</h1>
            <p className="text-gray-600">Project Code: {project?.code}</p>
          </div>
          
          <div className="flex gap-2">
            <ExportButton projectId={params.projectId} categories={categories} />
            <Link href={`/projects/${params.projectId}/categories/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-2xl font-bold">{categories.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total {itemLabel}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Image className="h-4 w-4 mr-2 text-purple-600" aria-hidden="true" />
              <span className="text-2xl font-bold">{totalSnags}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open {itemLabel}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-orange-600" />
              <span className="text-2xl font-bold">{openSnags}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Closed {itemLabel}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              <span className="text-2xl font-bold">{closedSnags}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first category to start organizing {itemLabel.toLowerCase()}s
            </p>
            <Link href={`/projects/${params.projectId}/categories/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              projectId={params.projectId}
              itemLabel={itemLabel}
              onUpdate={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  )
}