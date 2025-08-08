'use client'

import { Camera, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { compressImage, needsCompression } from '@/lib/utils/image-compression'

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
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileUpload = useCallback(
    async (file: File) => {
      let fileToUpload = file

      // Compress if needed (> 5MB)
      if (needsCompression(file, 5)) {
        console.log('File needs compression, compressing...')
        try {
          fileToUpload = await compressImage(file)
        } catch (compressionError) {
          console.error('Compression failed, trying original:', compressionError)
          // Continue with original file if compression fails
        }
      }

      // Check file size after compression (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (fileToUpload.size > maxSize) {
        const sizeMB = (fileToUpload.size / 1024 / 1024).toFixed(2)
        alert(`File size (${sizeMB}MB) exceeds the 10MB limit even after compression. Please choose a smaller image.`)
        return
      }

      // Log file details for debugging
      console.log('Uploading file:', {
        name: fileToUpload.name,
        size: `${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`,
        type: fileToUpload.type,
        wasCompressed: fileToUpload !== file
      })

      // Create preview URL
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      setUploading(true)
      setUploadProgress(0)

      try {
        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('projectId', projectId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Upload failed:', errorData)
          throw new Error(errorData.details || errorData.error || 'Upload failed')
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
      } catch (error) {
        console.error('Photo upload error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        alert(`Failed to upload photo: ${errorMessage}`)

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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      await handleFileUpload(acceptedFiles[0])
    },
    [handleFileUpload]
  )

  const handleCameraCapture = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        await handleFileUpload(file)
      }
      // Reset input so the same file can be selected again
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    },
    [handleFileUpload]
  )

  const handleGallerySelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        await handleFileUpload(file)
      }
      // Reset input so the same file can be selected again
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    },
    [handleFileUpload]
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
        <div className="space-y-4">
          {/* Mobile-first camera/gallery buttons */}
          <div className="flex gap-3 md:hidden">
            <Button
              type="button"
              variant="default"
              className="flex-1"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Choose from Gallery
            </Button>
          </div>

          {/* Desktop drag & drop area with integrated buttons */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive && 'border-primary bg-primary/5',
              uploading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center gap-4">
              {isDragActive ? (
                <>
                  <Upload className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">Drop photo here</p>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drag & drop a photo here</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP • Max 10MB</p>
                  </div>

                  {/* Desktop camera/gallery buttons */}
                  <div className="hidden md:flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        cameraInputRef.current?.click()
                      }}
                      disabled={uploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        galleryInputRef.current?.click()
                      }}
                      disabled={uploading}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
            disabled={uploading}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGallerySelect}
            disabled={uploading}
          />
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
