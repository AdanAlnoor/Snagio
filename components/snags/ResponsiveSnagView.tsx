'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { lazy, Suspense, useState } from 'react'
import { SnagCard } from '@/components/mobile/SnagCard'
import { useIsMobile } from '@/hooks/use-media-query'

// Lazy load heavy components
const CommentsModal = lazy(() =>
  import('./CommentsModal').then(mod => ({ default: mod.CommentsModal }))
)
const StatusModal = lazy(() => import('./StatusModal').then(mod => ({ default: mod.StatusModal })))
const SnagTableInline = lazy(() =>
  import('./SnagTableInline').then(mod => ({ default: mod.SnagTableInline }))
)

// Loading spinner component
const ModalLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
)

interface ResponsiveSnagViewProps {
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

export default function ResponsiveSnagView({
  snags,
  projectId,
  categoryId,
  settings,
}: ResponsiveSnagViewProps) {
  const isMobile = useIsMobile()
  const router = useRouter()

  // Modal states
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [commentsModalOpen, setCommentsModalOpen] = useState(false)
  const [selectedSnag, setSelectedSnag] = useState<any>(null)

  const handleStatusClick = (snag: any) => {
    setSelectedSnag(snag)
    setStatusModalOpen(true)
  }

  const handleCommentClick = (snag: any) => {
    setSelectedSnag(snag)
    setCommentsModalOpen(true)
  }

  const handleDelete = () => {
    router.refresh()
  }

  return (
    <>
      {isMobile ? (
        // Mobile view - Card layout
        <div className="grid gap-4">
          {snags.map(snag => (
            <SnagCard
              key={snag.id}
              snag={snag}
              projectId={projectId}
              categoryId={categoryId}
              onDelete={handleDelete}
              onStatusChange={() => router.refresh()}
            />
          ))}
        </div>
      ) : (
        // Desktop view - Table layout
        <Suspense fallback={<ModalLoader />}>
          <SnagTableInline
            snags={snags.map(snag => ({
              ...snag,
              comments: snag.comments || [],
            }))}
            projectId={projectId}
            categoryId={categoryId}
            settings={settings}
            onStatusClick={handleStatusClick}
            onCommentClick={handleCommentClick}
          />
        </Suspense>
      )}

      {/* Only render modals when they're opened */}
      {statusModalOpen && selectedSnag && (
        <Suspense fallback={<ModalLoader />}>
          <StatusModal
            snag={selectedSnag}
            projectId={projectId}
            categoryId={categoryId}
            open={statusModalOpen}
            onOpenChange={setStatusModalOpen}
          />
        </Suspense>
      )}

      {commentsModalOpen && selectedSnag && (
        <Suspense fallback={<ModalLoader />}>
          <CommentsModal
            snag={selectedSnag}
            open={commentsModalOpen}
            onOpenChange={setCommentsModalOpen}
          />
        </Suspense>
      )}
    </>
  )
}
