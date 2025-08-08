import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

// Configure the route to handle larger file uploads
export const runtime = 'nodejs' // Use Node.js runtime for file uploads
export const maxDuration = 30 // Maximum function duration in seconds

export async function POST(request: NextRequest) {
  try {
    // Check content length header first
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024)
      console.log(`Upload request size: ${sizeInMB.toFixed(2)}MB`)
      
      // Reject if over 15MB (to account for form data overhead)
      if (sizeInMB > 15) {
        return NextResponse.json({ 
          error: 'Request too large', 
          details: `Request size (${sizeInMB.toFixed(2)}MB) exceeds maximum allowed size` 
        }, { status: 413 })
      }
    }

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError) {
      console.error('FormData parsing error:', formError)
      return NextResponse.json({ 
        error: 'Failed to parse upload data', 
        details: 'The file may be too large or the request format is invalid' 
      }, { status: 400 })
    }

    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file || !projectId) {
      return NextResponse.json({ error: 'File and projectId are required' }, { status: 400 })
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        createdById: user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large', 
        details: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit` 
      }, { status: 400 })
    }

    // Log file details for debugging
    console.log('Processing upload:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      projectId
    })

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${projectId}/${uuidv4()}.${fileExt}`
    const thumbnailName = `${projectId}/thumb_${uuidv4()}.${fileExt}`

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload original image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('snag-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: uploadError.message || 'Unknown storage error' 
      }, { status: 500 })
    }

    // Generate thumbnail (in production, use image processing service)
    // For now, we'll use the same image
    const { data: thumbData } = await supabase.storage
      .from('snag-photos')
      .upload(thumbnailName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    // Get public URLs
    const {
      data: { publicUrl: originalUrl },
    } = supabase.storage.from('snag-photos').getPublicUrl(fileName)

    const {
      data: { publicUrl: thumbnailUrl },
    } = supabase.storage.from('snag-photos').getPublicUrl(thumbnailName)

    // Return photo data (not saved to DB yet - will be linked when snag is created)
    return NextResponse.json({
      id: uuidv4(),
      url: originalUrl,
      thumbnailUrl: thumbnailUrl,
      fileName,
      thumbnailName,
    })
  } catch (error) {
    console.error('Upload API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to upload file', 
      details: errorMessage 
    }, { status: 500 })
  }
}
