'use client'

import { Camera, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface Project {
  id: string
  name: string
  categories: Array<{
    id: string
    name: string
  }>
}

interface CameraCaptureProps {
  projects: Project[]
}

export function CameraCapture({ projects }: CameraCaptureProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  const currentProject = projects.find(p => p.id === selectedProject)
  const hasCategories = currentProject && currentProject.categories.length > 0

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedProject || !selectedCategory) return

    setUploading(true)

    try {
      // Upload the photo
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', selectedProject)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload photo')
      }

      const uploadData = await uploadResponse.json()

      // Create a new snag with the photo
      const snagData = {
        location: 'Quick Capture',
        description: 'Photo captured from mobile',
        priority: 'MEDIUM',
        status: 'OPEN',
        categoryId: selectedCategory,
        photos: [
          {
            id: uploadData.id,
            url: uploadData.url,
            thumbnailUrl: uploadData.thumbnailUrl,
          },
        ],
      }

      const snagResponse = await fetch('/api/snags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snagData),
      })

      if (!snagResponse.ok) {
        throw new Error('Failed to create snag')
      }

      const snag = await snagResponse.json()

      toast({
        title: 'Snag created',
        description: 'Photo captured and snag created successfully',
      })

      // Navigate to the new snag
      router.push(`/projects/${selectedProject}/categories/${selectedCategory}/snags/${snag.id}`)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'Failed to capture photo. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Project and Category Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="project">Select Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger id="project">
              <SelectValue placeholder="Choose a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProject && hasCategories && (
          <div>
            <Label htmlFor="category">Select Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {currentProject.categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Camera Capture */}
      {selectedProject && selectedCategory && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Capture Photo</h3>
            <p className="text-sm text-muted-foreground">
              Take or select a photo to create a new snag
            </p>

            <div className="flex flex-col gap-3">
              {/* Camera capture for mobile */}
              <label htmlFor="camera-capture">
                <input
                  id="camera-capture"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileCapture}
                  disabled={uploading}
                />
                <Button asChild disabled={uploading} className="w-full">
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </span>
                </Button>
              </label>

              {/* File upload fallback */}
              <label htmlFor="file-upload">
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileCapture}
                  disabled={uploading}
                />
                <Button asChild variant="outline" disabled={uploading} className="w-full">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose from Gallery
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </Card>
      )}

      {!selectedProject && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>Please select a project to continue</p>
        </Card>
      )}

      {selectedProject && !hasCategories && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">This project has no categories yet.</p>
          <Button onClick={() => router.push(`/projects/${selectedProject}/categories/new`)}>
            Create Category
          </Button>
        </Card>
      )}
    </div>
  )
}
