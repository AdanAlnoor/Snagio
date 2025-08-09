// Utility functions for image optimization

// Generate a base64 blur placeholder
export const getBlurDataURL = (width: number = 10, height: number = 10) => {
  const blurSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="5"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#f3f4f6" filter="url(#blur)"/>
    </svg>
  `
  const base64 = Buffer.from(blurSvg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

// Generate optimized image URL with size parameters
export const getOptimizedImageUrl = (url: string, width?: number, quality: number = 80) => {
  if (!url) return ''

  // If it's a Dropbox URL, it's already optimized (direct link)
  if (url.includes('dropboxusercontent.com') || url.includes('dropbox.com')) {
    // Dropbox URLs are already direct links, no transformation needed
    return url
  }

  // If it's a Supabase storage URL, we can add transform parameters
  if (url.includes('supabase.co/storage')) {
    const transformParams = []
    if (width) transformParams.push(`width=${width}`)
    transformParams.push(`quality=${quality}`)

    // Add transform parameters to the URL
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${transformParams.join('&')}`
  }

  return url
}

// Calculate responsive sizes for Next.js Image component
export const getImageSizes = (type: 'thumbnail' | 'full' | 'pdf') => {
  switch (type) {
    case 'thumbnail':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw'
    case 'full':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw'
    case 'pdf':
      return '280px' // Fixed size for PDF export (70mm at 100dpi)
    default:
      return '100vw'
  }
}
