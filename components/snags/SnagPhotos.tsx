'use client'

import { ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface SnagPhoto {
  id: string
  url: string
  thumbnailUrl?: string | null
  annotations?: any
}

interface SnagPhotosProps {
  photos: SnagPhoto[]
}

export function SnagPhotos({ photos }: SnagPhotosProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No photos uploaded yet</div>
  }

  const openPhoto = (index: number) => {
    setSelectedPhotoIndex(index)
  }

  const nextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1)
    }
  }

  const prevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1)
    }
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openPhoto(index)}
          >
            <Image
              src={photo.thumbnailUrl || photo.url}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 right-2">
                <Maximize2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog
        open={selectedPhotoIndex !== null}
        onOpenChange={(open: boolean) => !open && setSelectedPhotoIndex(null)}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          {selectedPhotoIndex !== null && (
            <div className="relative w-full h-full min-h-[600px] bg-black">
              <Image
                src={photos[selectedPhotoIndex].url}
                alt={`Photo ${selectedPhotoIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />

              {/* Navigation */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={e => {
                    e.stopPropagation()
                    prevPhoto()
                  }}
                  disabled={selectedPhotoIndex === 0}
                  className="rounded-full bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={e => {
                    e.stopPropagation()
                    nextPhoto()
                  }}
                  disabled={selectedPhotoIndex === photos.length - 1}
                  className="rounded-full bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Photo Info */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="flex items-center justify-between text-white">
                  <span className="text-sm">
                    Photo {selectedPhotoIndex + 1} of {photos.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = photos[selectedPhotoIndex].url
                      link.download = `photo-${selectedPhotoIndex + 1}.jpg`
                      link.click()
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
