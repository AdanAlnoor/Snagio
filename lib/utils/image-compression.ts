/**
 * Compress an image file by resizing it to a maximum dimension while maintaining aspect ratio
 */
export async function compressImage(file: File, maxDimension: number = 2048): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height
        
        // Only resize if image is larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            
            // Create new File from blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            
            console.log('Image compressed:', {
              original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
              compressed: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
              reduction: `${(100 - (compressedFile.size / file.size) * 100).toFixed(1)}%`
            })
            
            resolve(compressedFile)
          },
          'image/jpeg',
          0.85 // 85% quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Check if an image needs compression based on file size
 */
export function needsCompression(file: File, maxSizeMB: number = 5): boolean {
  const fileSizeMB = file.size / (1024 * 1024)
  return fileSizeMB > maxSizeMB
}