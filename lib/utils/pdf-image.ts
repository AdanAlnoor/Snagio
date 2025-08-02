/**
 * Helper function to fetch image as base64 for PDF embedding
 */
export async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    
    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    
    // Determine MIME type
    const mimeType = blob.type || 'image/jpeg'
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  }
}