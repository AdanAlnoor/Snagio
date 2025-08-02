import { format } from 'date-fns'

interface SnagDetailsProps {
  snag: {
    location: string
    description: string
    solution?: string | null
    updatedAt: Date
  }
  settings: {
    locationLabel: string
    descriptionLabel: string
  }
}

export function SnagDetails({ snag, settings }: SnagDetailsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">{settings.locationLabel}</h4>
        <p className="text-muted-foreground">{snag.location}</p>
      </div>

      <div>
        <h4 className="font-medium mb-2">{settings.descriptionLabel}</h4>
        <p className="text-muted-foreground whitespace-pre-wrap">{snag.description}</p>
      </div>

      {snag.solution && (
        <div>
          <h4 className="font-medium mb-2">Solution</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{snag.solution}</p>
        </div>
      )}

      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Last updated: {format(new Date(snag.updatedAt), 'PPp')}
        </p>
      </div>
    </div>
  )
}