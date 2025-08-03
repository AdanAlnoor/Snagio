import jsPDF from 'jspdf'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import { fetchImageAsBase64 } from '@/lib/utils/pdf-image'

// A4 dimensions in mm
const A4_WIDTH = 210
const A4_HEIGHT = 297
const MARGIN = 15
const PHOTO_WIDTH = 70 // Critical requirement: 70mm photo width
const PHOTO_HEIGHT = 52.5 // 4:3 aspect ratio
const TEXT_COLUMN_WIDTH = A4_WIDTH - 2 * MARGIN - PHOTO_WIDTH - 10 // 10mm gap between photo and text

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, categoryId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Fetch project with settings
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        settings: true,
        categories: {
          where: categoryId ? { id: categoryId } : undefined,
          include: {
            snags: {
              include: {
                photos: true,
                assignedTo: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!project || project.createdById !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Add project header
    pdf.setFontSize(20)
    pdf.text(project.name, MARGIN, 20)

    pdf.setFontSize(12)
    pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, MARGIN, 30)

    let yPosition = 45
    let pageNumber = 1

    // Process each category
    for (const category of project.categories) {
      // Category header
      if (yPosition > A4_HEIGHT - 100) {
        pdf.addPage()
        yPosition = MARGIN
        pageNumber++
      }

      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(category.name, MARGIN, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')

      // Process snags in the category
      for (const snag of category.snags) {
        // Check if we need a new page
        if (yPosition > A4_HEIGHT - PHOTO_HEIGHT - 20) {
          pdf.addPage()
          yPosition = MARGIN
          pageNumber++
        }

        // Draw a border around the snag entry
        pdf.rect(MARGIN, yPosition - 5, A4_WIDTH - 2 * MARGIN, PHOTO_HEIGHT + 10)

        // Add photo if available
        if (snag.photos.length > 0) {
          const photo = snag.photos[0] // Use first photo
          try {
            // Fetch and embed actual image
            const imageData = await fetchImageAsBase64(photo.url)
            if (imageData) {
              pdf.addImage(
                imageData,
                'JPEG',
                MARGIN + 2,
                yPosition - 3,
                PHOTO_WIDTH,
                PHOTO_HEIGHT,
                undefined,
                'FAST'
              )
            } else {
              // Fallback if image fetch fails
              pdf.setFillColor(240, 240, 240)
              pdf.rect(MARGIN + 2, yPosition - 3, PHOTO_WIDTH, PHOTO_HEIGHT, 'F')
              pdf.setFontSize(8)
              pdf.text(
                'Image unavailable',
                MARGIN + PHOTO_WIDTH / 2,
                yPosition + PHOTO_HEIGHT / 2,
                { align: 'center' }
              )
            }
          } catch (error) {
            console.error('Error adding photo:', error)
            // Fallback placeholder
            pdf.setFillColor(240, 240, 240)
            pdf.rect(MARGIN + 2, yPosition - 3, PHOTO_WIDTH, PHOTO_HEIGHT, 'F')
            pdf.setFontSize(8)
            pdf.text(
              'Error loading image',
              MARGIN + PHOTO_WIDTH / 2,
              yPosition + PHOTO_HEIGHT / 2,
              { align: 'center' }
            )
          }
        } else {
          // No photo placeholder
          pdf.setFillColor(250, 250, 250)
          pdf.rect(MARGIN + 2, yPosition - 3, PHOTO_WIDTH, PHOTO_HEIGHT, 'F')
          pdf.setFontSize(8)
          pdf.text('No Photo', MARGIN + PHOTO_WIDTH / 2, yPosition + PHOTO_HEIGHT / 2, {
            align: 'center',
          })
        }

        // Add text information next to photo
        const textX = MARGIN + PHOTO_WIDTH + 10
        let textY = yPosition

        // Use custom labels from project settings
        const labels = {
          item: project.settings?.itemLabel || 'Item',
          number: project.settings?.numberLabel || 'Number',
          location: project.settings?.locationLabel || 'Location',
          description: project.settings?.descriptionLabel || 'Description',
          status: project.settings?.statusLabel || 'Status',
          priority: 'Priority',
          assignedTo: 'Assigned To',
        }

        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${labels.item} #${snag.number}`, textX, textY)
        textY += 6

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)

        if (snag.location) {
          pdf.text(`${labels.location}: ${snag.location}`, textX, textY)
          textY += 5
        }

        if (snag.description) {
          const lines = pdf.splitTextToSize(
            `${labels.description}: ${snag.description}`,
            TEXT_COLUMN_WIDTH
          )
          pdf.text(lines, textX, textY)
          textY += lines.length * 4
        }

        pdf.text(`${labels.status}: ${snag.status}`, textX, textY)
        textY += 5

        pdf.text(`${labels.priority}: ${snag.priority}`, textX, textY)
        textY += 5

        if (snag.assignedTo) {
          const name =
            `${snag.assignedTo.firstName} ${snag.assignedTo.lastName}`.trim() ||
            snag.assignedTo.email
          pdf.text(`${labels.assignedTo}: ${name}`, textX, textY)
        }

        yPosition += PHOTO_HEIGHT + 15
      }
    }

    // Add page numbers
    const totalPages = pdf.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.text(`Page ${i} of ${totalPages}`, A4_WIDTH / 2, A4_HEIGHT - 10, { align: 'center' })
    }

    // Generate PDF as base64
    const pdfOutput = pdf.output('datauristring')

    return NextResponse.json({
      pdf: pdfOutput,
      filename: `${project.name.replace(/[^a-z0-9]/gi, '_')}_export_${new Date().toISOString().split('T')[0]}.pdf`,
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
