import { ArrowLeft, FolderOpen, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CategoryList } from '@/components/categories/CategoryList'
import { ExportButton } from '@/components/export/ExportButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

interface CategoryPageProps {
  params: Promise<{ projectId: string }>
}

export default async function CategoriesPage({ params }: CategoryPageProps) {
  const startTime = Date.now()

  const { projectId } = await params
  const supabase = await createServerClient()

  const authStart = Date.now()
  const {
    data: { user },
  } = await supabase.auth.getUser()


  if (!user) {
    notFound()
  }

  // Fetch project first to verify access
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      createdById: user.id,
    },
    include: {
      settings: true,
    },
  })

  if (!project) {
    notFound()
  }

  // Fetch all data using single optimized query
  const queryStart = Date.now()

  // Get categories with aggregated counts in a single query
  const categoriesData = await prisma.$queryRaw<
    Array<{
      id: string
      project_id: string
      name: string
      code: string
      description: string | null
      color: string
      icon: string
      order_index: number
      parent_category_id: string | null
      created_at: Date
      updated_at: Date
      total_count: bigint
      open_count: bigint
      closed_count: bigint
    }>
  >`
    SELECT 
      c.id,
      c.project_id,
      c.name,
      c.code,
      c.description,
      c.color,
      c.icon,
      c.order_index,
      c.parent_category_id,
      c.created_at,
      c.updated_at,
      COALESCE(COUNT(s.id), 0)::bigint as total_count,
      COALESCE(SUM(CASE WHEN s.status IN ('OPEN', 'IN_PROGRESS', 'PENDING_REVIEW') THEN 1 ELSE 0 END), 0)::bigint as open_count,
      COALESCE(SUM(CASE WHEN s.status = 'CLOSED' THEN 1 ELSE 0 END), 0)::bigint as closed_count
    FROM categories c
    LEFT JOIN snags s ON s.category_id = c.id
    WHERE c.project_id = ${projectId}
    GROUP BY c.id
    ORDER BY c.order_index ASC
  `

  // Transform to the expected format
  const categoriesWithCounts = categoriesData.map(row => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    code: row.code,
    description: row.description,
    color: row.color,
    icon: row.icon,
    orderIndex: row.order_index,
    parentCategoryId: row.parent_category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _count: {
      snags: Number(row.total_count),
    },
    openSnagCount: Number(row.open_count),
    closedSnagCount: Number(row.closed_count),
  }))


  const itemLabel = project.settings?.itemLabel || 'Snag'

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
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-gray-600">Project Code: {project.code}</p>
          </div>

          <div className="flex gap-2">
            <ExportButton projectId={projectId} categories={categoriesWithCounts} />
            <Link href={`/projects/${projectId}/categories/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Categories List */}
      {categoriesWithCounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first category to start organizing {itemLabel.toLowerCase()}s
            </p>
            <Link href={`/projects/${projectId}/categories/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <CategoryList
          categories={categoriesWithCounts}
          projectId={projectId}
          itemLabel={itemLabel}
        />
      )}
    </div>
  )
}
