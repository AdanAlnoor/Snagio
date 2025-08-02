import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Building } from 'lucide-react'
import { Project, ProjectStatus } from '@prisma/client'

interface ProjectCardProps {
  project: Project & {
    _count: {
      categories: number
    }
  }
}

const statusColors: Record<ProjectStatus, string> = {
  PLANNING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}/categories`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{project.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">{project.code}</p>
            </div>
            <Badge
              variant="secondary"
              className={statusColors[project.status]}
            >
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Building className="h-4 w-4 mr-2" />
            <span>{project.clientName}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="line-clamp-1">{project.address}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>
              {format(new Date(project.startDate), 'MMM d, yyyy')} -{' '}
              {format(new Date(project.expectedEndDate), 'MMM d, yyyy')}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            {project._count.categories} categories
          </p>
        </CardFooter>
      </Card>
    </Link>
  )
}