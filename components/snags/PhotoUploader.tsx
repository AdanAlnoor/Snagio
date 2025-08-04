'use client'

import { Camera, Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Photo {
  id: string
  url: string
  thumbnailUrl?: string
  caption?: string
}

interface PhotoUploaderProps {
  projectId: string
  onPhotoUploaded: (photo: Photo | null) => void
  existingPhoto?: Photo | null
}

export function PhotoUploader({
  projectId,
  onPhotoUploaded,
  existingPhoto = null,
}: PhotoUploaderProps) {
  const [photo, setPhoto] = useState<Photo | null>(existingPhoto)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0] // Only take the first file

      // Create preview URL
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      setUploading(true)
      setUploadProgress(0)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        const uploadedPhoto: Photo = {
          id: data.id,
          url: data.url,
          thumbnailUrl: data.thumbnailUrl,
        }

        setPhoto(uploadedPhoto)
        onPhotoUploaded(uploadedPhoto)

        // Clean up preview URL
        URL.revokeObjectURL(preview)
        setPreviewUrl(null)
      } catch (_error) {
        alert('Failed to upload photo. Please try again.')

        // Clean up preview URL
        URL.revokeObjectURL(preview)
        setPreviewUrl(null)
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [projectId, onPhotoUploaded]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    disabled: uploading,
    multiple: false,
  })

  const removePhoto = () => {
    setPhoto(null)
    onPhotoUploaded(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Show existing photo or upload area */}
      {photo || previewUrl ? (
        <div className="relative">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border">
            <Image
              src={previewUrl || photo?.thumbnailUrl || photo?.url || ''}
              alt="Snag photo"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {previewUrl && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          {!uploading && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={removePhoto}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive && 'border-primary bg-primary/5',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-2">
            {isDragActive ? (
              <>
                <Upload className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">Drop photo here</p>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop a photo here, or click to select</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP • Max 10MB</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading photo...
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  )
}
