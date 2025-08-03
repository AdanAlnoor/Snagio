'use client'

import { useState } from 'react'
import { SnagTable } from './SnagTable'
import { StatusModal } from './StatusModal'
import { CommentsModal } from './CommentsModal'

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
  }>
  projectId: string
  categoryId: string
  settings: any
  teamMembers?: Array<{ id: string; firstName: string; lastName: string }>
}

export function SnagListWrapper({
  snags,
  projectId,
  categoryId,
  settings,
  teamMembers = [],
}: SnagListWrapperProps) {
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

  return (
    <>
      <SnagTable
        snags={snags}
        projectId={projectId}
        categoryId={categoryId}
        settings={settings}
        onStatusClick={handleStatusClick}
        onCommentClick={handleCommentClick}
      />
      
      {/* Modals */}
      <StatusModal
        snag={selectedSnag}
        projectId={projectId}
        categoryId={categoryId}
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
      />
      
      <CommentsModal
        snag={selectedSnag}
        open={commentsModalOpen}
        onOpenChange={setCommentsModalOpen}
      />
    </>
  )
}
