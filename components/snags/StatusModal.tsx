'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface StatusModalProps {
  snag: {
    id: string
    status: string
    number: number
  } | null
  projectId: string
  categoryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusColors = {
  OPEN: 'bg-red-100 text-red-800 border-red-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300',
  CLOSED: 'bg-green-100 text-green-800 border-green-300',
  ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-300',
}

const statusTransitions: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'ON_HOLD', 'CLOSED'],
  IN_PROGRESS: ['PENDING_REVIEW', 'ON_HOLD', 'CLOSED'],
  PENDING_REVIEW: ['IN_PROGRESS', 'CLOSED', 'ON_HOLD'],
  ON_HOLD: ['OPEN', 'IN_PROGRESS'],
  CLOSED: ['OPEN'],
}

export function StatusModal({
  snag,
  projectId,
  categoryId,
  open,
  onOpenChange,
}: StatusModalProps) {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!snag) return null

  const availableStatuses = statusTransitions[snag.status] || []

  const handleSubmit = async () => {
    if (!selectedStatus || !reason.trim()) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/categories/${categoryId}/snags/${snag.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: selectedStatus,
            statusChangeReason: reason,
          }),
        }
      )

      if (response.ok) {
        router.refresh()
        onOpenChange(false)
        setSelectedStatus('')
        setReason('')
      } else {
        console.error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Status - Snag #{snag.number}</DialogTitle>
          <DialogDescription>
            Current status:{' '}
            <Badge
              variant="outline"
              className={cn('ml-2', statusColors[snag.status as keyof typeof statusColors])}
            >
              {snag.status.replace(/_/g, ' ')}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
              {availableStatuses.map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <RadioGroupItem value={status} id={status} />
                  <Label htmlFor={status} className="flex items-center gap-2 cursor-pointer">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', statusColors[status as keyof typeof statusColors])}
                    >
                      {status.replace(/_/g, ' ')}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide a reason for this status change..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStatus || !reason.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}