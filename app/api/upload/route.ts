import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import { dropboxService } from '@/lib/dropbox/client'

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
      
      // Reject if over 25MB (to account for form data overhead on 20MB files)
      if (sizeInMB > 25) {
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

    // Check file size (20MB limit)
    const maxSize = parseInt(process.env.DROPBOX_MAX_FILE_SIZE || '20971520') // 20MB default
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large', 
        details: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds ${maxSize / 1024 / 1024}MB limit` 
      }, { status: 400 })
    }

    // Log file details for debugging
    console.log('Processing upload:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      projectId
    })

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check if we should use Dropbox or Supabase
    const useDropbox = dropboxService.isConfigured()
    
    if (useDropbox) {
      // Generate organized Dropbox path
      const timestamp = new Date().toISOString().split('T')[0]
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileId = uuidv4()
      const projectName = project.name.replace(/[^a-z0-9]/gi, '_')
      const dropboxPath = `${process.env.DROPBOX_FOLDER_PATH || '/Snagio'}/${projectName}/${timestamp}/${fileId}.${fileExt}`
      
      console.log('Uploading to Dropbox:', {
        path: dropboxPath,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      })

      try {
        // Create folder structure if needed
        const folderPath = dropboxPath.substring(0, dropboxPath.lastIndexOf('/'))
        await dropboxService.createFolder(folderPath.substring(0, folderPath.lastIndexOf('/')))
        await dropboxService.createFolder(folderPath)
        
        // Upload to Dropbox
        const uploadResult = await dropboxService.uploadFile(
          dropboxPath,
          buffer,
          file.type
        )

        // For now, use the same URL for thumbnail (in production, generate proper thumbnail)
        return NextResponse.json({
          id: fileId,
          url: uploadResult.url,
          thumbnailUrl: uploadResult.url, // TODO: Generate actual thumbnail
          fileName: dropboxPath,
          thumbnailName: dropboxPath,
          storage: 'dropbox'
        })
      } catch (dropboxError: any) {
        console.error('Dropbox upload error:', dropboxError)
        return NextResponse.json({ 
          error: 'Failed to upload file to Dropbox', 
          details: dropboxError?.message || 'Please check Dropbox configuration' 
        }, { status: 500 })
      }
    } else {
      // Fallback to Supabase storage
      console.log('Dropbox not configured, using Supabase storage')
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${projectId}/${uuidv4()}.${fileExt}`
      const thumbnailName = `${projectId}/thumb_${uuidv4()}.${fileExt}`

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
        storage: 'supabase'
      })
    }
  } catch (error) {
    console.error('Upload API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to upload file', 
      details: errorMessage 
    }, { status: 500 })
  }
}
