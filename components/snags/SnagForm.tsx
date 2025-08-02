'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PhotoUploader } from '@/components/snags/PhotoUploader'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, MapPin, FileText, Users, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  solution: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  assignedToId: z.string().optional(),
  dueDate: z.date().optional(),
})

type FormData = z.infer<typeof formSchema>

interface SnagFormProps {
  projectId: string
  categoryId: string
  teamMembers: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
  }>
  settings: any
  initialData?: Partial<FormData> & { photos?: string[] }
  snagId?: string
}

export function SnagForm({
  projectId,
  categoryId,
  teamMembers,
  settings,
  initialData,
  snagId,
}: SnagFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(initialData?.photos || [])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: initialData?.location || '',
      description: initialData?.description || '',
      solution: initialData?.solution || '',
      priority: initialData?.priority || 'MEDIUM',
      assignedToId: initialData?.assignedToId || '',
      dueDate: initialData?.dueDate,
    },
  })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const url = snagId
        ? `/api/projects/${projectId}/categories/${categoryId}/snags/${snagId}`
        : `/api/projects/${projectId}/categories/${categoryId}/snags`

      const response = await fetch(url, {
        method: snagId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate?.toISOString(),
          photos: uploadedPhotos,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const savedSnag = await response.json()
      router.push(`/projects/${projectId}/categories/${categoryId}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving snag:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo Upload - PRIMARY FOCUS */}
        <Card>
          <CardHeader>
            <CardTitle>{settings.photoLabel || 'Photos'}</CardTitle>
            <CardDescription>
              Upload photos to document the {(settings.itemLabel || 'snag').toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoUploader
              projectId={projectId}
              onPhotosUploaded={setUploadedPhotos}
              existingPhotos={[]}
            />
          </CardContent>
        </Card>

        {/* Location and Description */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {settings.locationLabel || 'Location'}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Where is this located?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {settings.descriptionLabel || 'Description'}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the issue in detail"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="solution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{settings.solutionLabel || 'Proposed Solution'}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional: How should this be resolved?"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe how this {(settings.itemLabel || 'snag').toLowerCase()} should be addressed
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Assignment and Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment & Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      Priority
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Assign To
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When should this be resolved by?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : snagId ? 'Update' : 'Create'} {settings.itemLabel || 'Snag'}
          </Button>
        </div>
      </form>
    </Form>
  )
}