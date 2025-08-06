'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import with no SSR to avoid double rendering
const ResponsiveSnagView = dynamic(() => import('./ResponsiveSnagView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface SnagListWrapperProps {
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
      id: string
      firstName: string
      lastName: string
    } | null
    comments?: Array<{
      id: string
      content: string
      createdAt: Date
      user: {
        firstName: string | null
        lastName: string | null
        email: string
      }
    }>
    _count: {
      comments: number
    }
  }>
  projectId: string
  categoryId: string
  settings: any
  teamMembers?: Array<{ id: string; firstName: string; lastName: string }>
  totalSnags?: number
  itemsPerPage?: number
}

export function SnagListWrapper({
  snags,
  projectId,
  categoryId,
  settings,
  teamMembers = [],
  totalSnags,
  itemsPerPage,
}: SnagListWrapperProps) {
  // Render the dynamically imported component
  // No SSR means no double rendering during hydration
  return (
    <ResponsiveSnagView
      snags={snags}
      projectId={projectId}
      categoryId={categoryId}
      settings={settings}
      teamMembers={teamMembers}
      totalSnags={totalSnags}
      itemsPerPage={itemsPerPage}
    />
  )
}
