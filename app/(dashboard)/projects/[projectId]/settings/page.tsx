'use client'

import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProjectSettings {
  itemLabel: string
  numberLabel: string
  locationLabel: string
  photoLabel: string
  descriptionLabel: string
  solutionLabel: string
  statusLabel: string
  photoSize: 'SMALL' | 'MEDIUM' | 'LARGE'
  rowsPerPage: number
}

interface ProjectTemplate {
  name: string
  settings: Partial<ProjectSettings>
}

const templates: ProjectTemplate[] = [
  {
    name: 'Construction Snagging',
    settings: {
      itemLabel: 'Snag',
      descriptionLabel: 'Description',
      solutionLabel: 'Solution',
    },
  },
  {
    name: 'Property Inspection',
    settings: {
      itemLabel: 'Issue',
      descriptionLabel: 'Findings',
      solutionLabel: 'Recommendation',
    },
  },
  {
    name: 'Quality Control',
    settings: {
      itemLabel: 'Defect',
      descriptionLabel: 'Defect Description',
      solutionLabel: 'Corrective Action',
    },
  },
  {
    name: 'Safety Audit',
    settings: {
      itemLabel: 'Hazard',
      descriptionLabel: 'Hazard Description',
      solutionLabel: 'Safety Measure',
    },
  },
]

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<any>(null)

  const [settings, setSettings] = useState<ProjectSettings>({
    itemLabel: 'Snag',
    numberLabel: 'No.',
    locationLabel: 'Location',
    photoLabel: 'Photo',
    descriptionLabel: 'Description',
    solutionLabel: 'Solution',
    statusLabel: 'STATUS',
    photoSize: 'LARGE',
    rowsPerPage: 5,
  })

  useEffect(() => {
    fetchProject()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) throw new Error('Failed to fetch project')

      const data = await response.json()
      setProject(data)

      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ProjectSettings, value: string | number) => {
    setSettings({
      ...settings,
      [field]: value,
    })
  }

  const applyTemplate = (template: ProjectTemplate) => {
    setSettings({
      ...settings,
      ...template.settings,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      router.push(`/projects/${projectId}/categories`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link
        href="/projects"
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to projects
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{project?.name || 'Project'} Settings</h1>
        <p className="text-gray-600">
          Customize column headers and display settings for your project
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>Apply a template to quickly set up common use cases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {templates.map(template => (
              <Button
                key={template.name}
                variant="outline"
                onClick={() => applyTemplate(template)}
                disabled={saving}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Custom Labels</CardTitle>
            <CardDescription>Define how columns appear in your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="itemLabel">Item Label</Label>
                <Input
                  id="itemLabel"
                  value={settings.itemLabel}
                  onChange={e => handleChange('itemLabel', e.target.value)}
                  placeholder="e.g., Snag, Issue, Defect"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberLabel">Number Label</Label>
                <Input
                  id="numberLabel"
                  value={settings.numberLabel}
                  onChange={e => handleChange('numberLabel', e.target.value)}
                  placeholder="e.g., No., ID, #"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationLabel">Location Label</Label>
                <Input
                  id="locationLabel"
                  value={settings.locationLabel}
                  onChange={e => handleChange('locationLabel', e.target.value)}
                  placeholder="e.g., Location, Area, Zone"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photoLabel">Photo Label</Label>
                <Input
                  id="photoLabel"
                  value={settings.photoLabel}
                  onChange={e => handleChange('photoLabel', e.target.value)}
                  placeholder="e.g., Photo, Image, Evidence"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionLabel">Description Label</Label>
                <Input
                  id="descriptionLabel"
                  value={settings.descriptionLabel}
                  onChange={e => handleChange('descriptionLabel', e.target.value)}
                  placeholder="e.g., Description, Details, Findings"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="solutionLabel">Solution Label</Label>
                <Input
                  id="solutionLabel"
                  value={settings.solutionLabel}
                  onChange={e => handleChange('solutionLabel', e.target.value)}
                  placeholder="e.g., Solution, Action, Fix"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusLabel">Status Label</Label>
                <Input
                  id="statusLabel"
                  value={settings.statusLabel}
                  onChange={e => handleChange('statusLabel', e.target.value)}
                  placeholder="e.g., STATUS, State, Progress"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Display Settings</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="photoSize">Photo Size in PDF</Label>
                  <Select
                    value={settings.photoSize}
                    onValueChange={value => handleChange('photoSize', value)}
                    disabled={saving}
                  >
                    <SelectTrigger id="photoSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMALL">Small (40mm × 30mm)</SelectItem>
                      <SelectItem value="MEDIUM">Medium (55mm × 40mm)</SelectItem>
                      <SelectItem value="LARGE">Large (65mm × 45mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rowsPerPage">Items per PDF Page</Label>
                  <Select
                    value={settings.rowsPerPage.toString()}
                    onValueChange={value => handleChange('rowsPerPage', parseInt(value))}
                    disabled={saving}
                  >
                    <SelectTrigger id="rowsPerPage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 items</SelectItem>
                      <SelectItem value="4">4 items</SelectItem>
                      <SelectItem value="5">5 items (recommended)</SelectItem>
                      <SelectItem value="6">6 items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>

          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/categories`)}
              disabled={saving}
            >
              Skip for now
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
