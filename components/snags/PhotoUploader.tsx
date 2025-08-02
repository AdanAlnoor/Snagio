'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Photo {
  id: string
  url: string
  thumbnailUrl?: string
  caption?: string
}

interface PhotoUploaderProps {
  projectId: string
  onPhotosUploaded: (photoIds: string[]) => void
  existingPhotos?: Photo[]
  maxPhotos?: number
}

export function PhotoUploader({
  projectId,
  onPhotosUploaded,
  existingPhotos = [],
  maxPhotos = 10,
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<Photo[]>(existingPhotos)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (photos.length + acceptedFiles.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`)
      return
    }

    // Create preview URLs
    const previews = acceptedFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(prev => [...prev, ...previews])

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadedPhotos: Photo[] = []

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i]
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
        uploadedPhotos.push({
          id: data.id,
          url: data.url,
          thumbnailUrl: data.thumbnailUrl,
        })

        setUploadProgress(((i + 1) / acceptedFiles.length) * 100)
      }

      setPhotos(prev => [...prev, ...uploadedPhotos])
      onPhotosUploaded([...photos, ...uploadedPhotos].map(p => p.id))

      // Clean up preview URLs
      previews.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photos. Please try again.')
      
      // Clean up preview URLs
      previews.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls(prev => prev.filter(url => !previews.includes(url)))
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [photos, maxPhotos, projectId, onPhotosUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: maxPhotos - photos.length,
    disabled: uploading || photos.length >= maxPhotos,
  })

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    onPhotosUploaded(newPhotos.map(p => p.id))
  }

  const removePreview = (index: number) => {
    const url = previewUrls[index]
    URL.revokeObjectURL(url)
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          uploading && 'opacity-50 cursor-not-allowed',
          photos.length >= maxPhotos && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-2">
          {isDragActive ? (
            <>
              <Upload className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium">Drop photos here</p>
            </>
          ) : (
            <>
              <Camera className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag & drop photos here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum {maxPhotos} photos • JPEG, PNG, GIF, WebP
              </p>
            </>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading photos...
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Photo Grid */}
      {(photos.length > 0 || previewUrls.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Existing Photos */}
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative group">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border">
                <Image
                  src={photo.thumbnailUrl || photo.url}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removePhoto(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Preview Images (being uploaded) */}
          {previewUrls.map((url, index) => (
            <div key={url} className="relative group">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border">
                <Image
                  src={url}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover opacity-50"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </div>
              {!uploading && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => removePreview(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {photos.length} of {maxPhotos} photos uploaded
      </p>
    </div>
  )
}