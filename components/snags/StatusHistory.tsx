import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface StatusHistoryItem {
  id: string
  fromStatus: string
  toStatus: string
  reason?: string | null
  changedAt: Date
  changedBy: {
    firstName: string | null
    lastName: string | null
    email: string
  }
}

interface StatusHistoryProps {
  history: StatusHistoryItem[]
}

export function StatusHistory({ history }: StatusHistoryProps) {
  const statusColors = {
    OPEN: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PENDING_REVIEW: 'bg-blue-100 text-blue-800',
    CLOSED: 'bg-green-100 text-green-800',
  }

  const getName = (user: StatusHistoryItem['changedBy']) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }
    return user.email
  }

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No status changes yet</p>
  }

  return (
    <div className="space-y-3">
      {history.map((item, index) => (
        <div key={item.id} className="relative">
          {index < history.length - 1 && (
            <div className="absolute left-2 top-8 w-0.5 h-full bg-border" />
          )}
          <div className="flex gap-3">
            <div className="w-4 h-4 rounded-full bg-primary mt-1 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={statusColors[item.toStatus as keyof typeof statusColors]}
                >
                  {item.toStatus.replace('_', ' ')}
                </Badge>
                {item.fromStatus !== item.toStatus && (
                  <>
                    <span className="text-xs text-muted-foreground">from</span>
                    <Badge variant="outline" className="text-xs">
                      {item.fromStatus.replace('_', ' ')}
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {getName(item.changedBy)} • {format(new Date(item.changedAt), 'PPp')}
              </p>
              {item.reason && (
                <p className="text-sm text-muted-foreground">{item.reason}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}