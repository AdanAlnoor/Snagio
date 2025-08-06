'use client'

import { Camera } from 'lucide-react'
import { useMemo } from 'react'

interface CategoryStatsProps {
  snags: Array<{
    status: string
    photos: Array<any>
  }>
}

export function CategoryStats({ snags }: CategoryStatsProps) {
  // Memoize expensive stat calculations
  const stats = useMemo(() => {
    const result = {
      total: snags.length,
      open: 0,
      closed: 0,
      withPhotos: 0,
    }

    // Single pass through snags for all calculations
    snags.forEach(snag => {
      if (['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(snag.status)) {
        result.open++
      } else if (snag.status === 'CLOSED') {
        result.closed++
      }

      if (snag.photos.length > 0) {
        result.withPhotos++
      }
    })

    return result
  }, [snags])

  return (
    <>
      {/* Mobile Stats */}
      <div className="flex items-center gap-4 text-sm lg:hidden">
        <span>
          Total: <span className="font-semibold">{stats.total}</span>
        </span>
        <span>
          Open: <span className="font-semibold text-orange-600">{stats.open}</span>
        </span>
        <span>
          Closed: <span className="font-semibold text-green-600">{stats.closed}</span>
        </span>
      </div>

      {/* Desktop Stats */}
      <div className="hidden lg:flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{stats.total}</span>
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">
          Open: <span className="font-semibold text-orange-600">{stats.open}</span>
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">
          Closed: <span className="font-semibold text-green-600">{stats.closed}</span>
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="flex items-center gap-1">
          <Camera className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold text-foreground">{stats.withPhotos}</span>
        </span>
      </div>
    </>
  )
}
