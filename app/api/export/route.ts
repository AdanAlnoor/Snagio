import { format } from 'date-fns'
import jsPDF from 'jspdf'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import { fetchImageAsBase64 } from '@/lib/utils/pdf-image'

// A4 dimensions in mm
const A4_WIDTH = 210
const A4_HEIGHT = 297
const MARGIN = 15
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN

// Column widths (total: 180mm)
const COLUMNS = {
  number: 10, // 5.5%
  location: 20, // 11%
  photo: 70, // 38.9% - Critical requirement
  description: 35, // 19.5%
  solution: 25, // 14%
  status: 20, // 11%
}

const PHOTO_HEIGHT = 45 // Reduced for more compact layout
const ROW_MIN_HEIGHT = PHOTO_HEIGHT + 8 // Photo height + padding
const HEADER_HEIGHT = 8

// Colors
const COLORS = {
  primary: '#1E293B',
  secondary: '#64748B',
  accent: '#3B82F6',
  lightBg: '#F8FAFC',
  alternateBg: '#F1F5F9',
  border: '#E2E8F0',
  // Status colors
  statusOpen: '#DC2626',
  statusInProgress: '#F97316',
  statusPending: '#3B82F6',
  statusClosed: '#10B981',
  statusOnHold: '#6B7280',
  // Priority colors
  priorityCritical: '#DC2626',
  priorityHigh: '#F97316',
  priorityMedium: '#FDE047',
  priorityLow: '#6B7280',
}

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
                photos: {
                  orderBy: { orderIndex: 'asc' },
                  take: 1,
                },
                assignedTo: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
              orderBy: { number: 'asc' },
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

    // Helper functions
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 }
    }

    const setColor = (hex: string) => {
      const rgb = hexToRgb(hex)
      pdf.setTextColor(rgb.r, rgb.g, rgb.b)
    }

    const setFillColor = (hex: string) => {
      const rgb = hexToRgb(hex)
      pdf.setFillColor(rgb.r, rgb.g, rgb.b)
    }

    const drawText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      maxLines: number = 3
    ) => {
      const lines = pdf.splitTextToSize(text, maxWidth)
      const linesToDraw = lines.slice(0, maxLines)
      if (lines.length > maxLines) {
        linesToDraw[maxLines - 1] = linesToDraw[maxLines - 1].slice(0, -3) + '...'
      }
      pdf.text(linesToDraw, x, y)
      return linesToDraw.length * 4 // Return height used
    }

    // Add compact project header with background
    setFillColor(COLORS.primary)
    pdf.rect(0, 0, A4_WIDTH, 20, 'F')

    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(project.name, MARGIN, 12)

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Export Date: ${format(new Date(), 'MMMM d, yyyy')}`, A4_WIDTH - MARGIN, 12, {
      align: 'right',
    })

    let yPosition = 25
    let pageNumber = 1
    let rowIndex = 0
    let currentCategory = null

    // Use custom labels from project settings
    const labels = {
      number: project.settings?.numberLabel || 'No.',
      location: project.settings?.locationLabel || 'Location',
      photo: project.settings?.photoLabel || 'Photo',
      description: project.settings?.descriptionLabel || 'Description',
      solution: project.settings?.solutionLabel || 'Solution',
      status: project.settings?.statusLabel || 'Status',
    }

    // Helper function to draw page header with category
    const drawPageHeader = (categoryName: string) => {
      // Category bar
      setFillColor(COLORS.accent)
      pdf.rect(0, 20, A4_WIDTH, 15, 'F')

      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(categoryName, MARGIN, 28)

      yPosition = 40
    }

    // Helper function to draw table header
    const drawTableHeader = () => {
      // Header background
      setFillColor(COLORS.lightBg)
      pdf.rect(MARGIN, yPosition - 3, CONTENT_WIDTH, HEADER_HEIGHT - 2, 'F')

      // Header border
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.5)
      pdf.line(
        MARGIN,
        yPosition + HEADER_HEIGHT - 5,
        MARGIN + CONTENT_WIDTH,
        yPosition + HEADER_HEIGHT - 5
      )

      // Header text
      setColor(COLORS.primary)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')

      let xPos = MARGIN
      pdf.text(labels.number, xPos + 2, yPosition)
      xPos += COLUMNS.number

      pdf.text(labels.location, xPos + 2, yPosition)
      xPos += COLUMNS.location

      pdf.text(labels.photo, xPos + 2, yPosition)
      xPos += COLUMNS.photo

      pdf.text(labels.description, xPos + 2, yPosition)
      xPos += COLUMNS.description

      pdf.text(labels.solution, xPos + 2, yPosition)
      xPos += COLUMNS.solution

      pdf.text(labels.status, xPos + 2, yPosition)

      yPosition += HEADER_HEIGHT - 2
    }

    // Helper function to get status color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'OPEN':
          return COLORS.statusOpen
        case 'IN_PROGRESS':
          return COLORS.statusInProgress
        case 'PENDING_REVIEW':
          return COLORS.statusPending
        case 'CLOSED':
          return COLORS.statusClosed
        default:
          return COLORS.statusOnHold
      }
    }

    // Helper function to get priority color
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'CRITICAL':
          return COLORS.priorityCritical
        case 'HIGH':
          return COLORS.priorityHigh
        case 'MEDIUM':
          return COLORS.priorityMedium
        default:
          return COLORS.priorityLow
      }
    }

    // Process each category
    for (const category of project.categories) {
      if (category.snags.length === 0) continue // Skip empty categories

      currentCategory = category.name

      // First category starts immediately
      if (pageNumber === 1 && yPosition === 25) {
        drawPageHeader(category.name)
        drawTableHeader()
      } else {
        // New category on new page
        pdf.addPage()
        pageNumber++
        rowIndex = 0
        drawPageHeader(category.name)
        drawTableHeader()
      }

      // Process snags in the category
      for (const snag of category.snags) {
        // Check if we need a new page
        if (yPosition > A4_HEIGHT - ROW_MIN_HEIGHT - 20) {
          pdf.addPage()
          pageNumber++
          rowIndex = 0

          // Redraw headers on new page
          drawPageHeader(category.name)
          drawTableHeader()
        }

        // Alternate row background
        if (rowIndex % 2 === 1) {
          setFillColor(COLORS.alternateBg)
          pdf.rect(MARGIN, yPosition - 5, CONTENT_WIDTH, ROW_MIN_HEIGHT, 'F')
        }

        // Row border
        pdf.setDrawColor(240, 240, 240)
        pdf.setLineWidth(0.2)
        pdf.line(
          MARGIN,
          yPosition + ROW_MIN_HEIGHT - 5,
          MARGIN + CONTENT_WIDTH,
          yPosition + ROW_MIN_HEIGHT - 5
        )

        let xPos = MARGIN
        const textY = yPosition + 3

        // Number column with priority indicator
        setColor(COLORS.primary)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text(snag.number.toString(), xPos + 2, textY)

        // Priority dot
        if (snag.priority !== 'LOW') {
          const priorityColor = getPriorityColor(snag.priority)
          const rgb = hexToRgb(priorityColor)
          pdf.setFillColor(rgb.r, rgb.g, rgb.b)
          pdf.circle(xPos + 7, textY - 1, 1, 'F')
        }
        xPos += COLUMNS.number

        // Location column
        setColor(COLORS.secondary)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        drawText(snag.location, xPos + 2, textY, COLUMNS.location - 4, 3)
        xPos += COLUMNS.location

        // Photo column
        if (snag.photos.length > 0) {
          const photo = snag.photos[0]
          try {
            const imageData = await fetchImageAsBase64(photo.url)
            if (imageData) {
              // Add border around photo
              pdf.setDrawColor(200, 200, 200)
              pdf.setLineWidth(0.5)
              pdf.rect(xPos + 2.5, yPosition - 2.5, COLUMNS.photo - 5, PHOTO_HEIGHT, 'S')

              pdf.addImage(
                imageData,
                'JPEG',
                xPos + 2.5,
                yPosition - 2.5,
                COLUMNS.photo - 5,
                PHOTO_HEIGHT,
                undefined,
                'FAST'
              )
            } else {
              // Elegant placeholder
              setFillColor(COLORS.lightBg)
              pdf.rect(xPos + 2.5, yPosition - 2.5, COLUMNS.photo - 5, PHOTO_HEIGHT, 'F')
              pdf.setDrawColor(200, 200, 200)
              pdf.rect(xPos + 2.5, yPosition - 2.5, COLUMNS.photo - 5, PHOTO_HEIGHT, 'S')

              setColor(COLORS.secondary)
              pdf.setFontSize(8)
              pdf.text('No Image', xPos + COLUMNS.photo / 2, yPosition + PHOTO_HEIGHT / 2, {
                align: 'center',
              })
            }
          } catch (error) {
            console.error('Error adding photo:', error)
            setFillColor(COLORS.lightBg)
            pdf.rect(xPos + 2.5, yPosition - 2.5, COLUMNS.photo - 5, PHOTO_HEIGHT, 'F')
            pdf.setDrawColor(200, 200, 200)
            pdf.rect(xPos + 2.5, yPosition - 2.5, COLUMNS.photo - 5, PHOTO_HEIGHT, 'S')

            setColor(COLORS.secondary)
            pdf.setFontSize(8)
            pdf.text('Error', xPos + COLUMNS.photo / 2, yPosition + PHOTO_HEIGHT / 2, {
              align: 'center',
            })
          }
        } else {
          // No photo placeholder
          setFillColor(COLORS.lightBg)
          pdf.rect(xPos + 2.5, yPosition - 2.5, COLUMNS.photo - 5, PHOTO_HEIGHT, 'F')
          pdf.setDrawColor(200, 200, 200)
          pdf.rect(xPos + 2.5, yPosition - 2.5, COLUMNS.photo - 5, PHOTO_HEIGHT, 'S')

          setColor(COLORS.secondary)
          pdf.setFontSize(8)
          pdf.text('No Photo', xPos + COLUMNS.photo / 2, yPosition + PHOTO_HEIGHT / 2, {
            align: 'center',
          })
        }
        xPos += COLUMNS.photo

        // Description column
        setColor(COLORS.primary)
        pdf.setFontSize(9)
        drawText(snag.description, xPos + 2, textY, COLUMNS.description - 4, 8)

        // Add assigned to and due date info below description if present
        if (snag.assignedTo || snag.dueDate) {
          let infoY = textY + 15
          setColor(COLORS.secondary)
          pdf.setFontSize(7)

          if (snag.assignedTo) {
            const name = `${snag.assignedTo.firstName} ${snag.assignedTo.lastName}`.trim()
            pdf.text(`${name}`, xPos + 2, infoY)
            infoY += 3
          }

          if (snag.dueDate) {
            pdf.text(`${format(new Date(snag.dueDate), 'MMM d')}`, xPos + 2, infoY)
          }
        }
        xPos += COLUMNS.description

        // Solution column
        setColor(COLORS.secondary)
        pdf.setFontSize(9)
        drawText(snag.solution || '-', xPos + 2, textY, COLUMNS.solution - 4, 8)
        xPos += COLUMNS.solution

        // Status column with colored badge
        const statusColor = getStatusColor(snag.status)
        const statusRgb = hexToRgb(statusColor)

        // Status background - light version of the color
        pdf.setFillColor(
          Math.min(255, statusRgb.r + 200),
          Math.min(255, statusRgb.g + 200),
          Math.min(255, statusRgb.b + 200)
        )
        const statusText =
          snag.status === 'IN_PROGRESS'
            ? 'IN PROG.'
            : snag.status === 'PENDING_REVIEW'
              ? 'REVIEW'
              : snag.status.replace(/_/g, ' ')
        const statusWidth = pdf.getTextWidth(statusText) + 4

        // Draw simple rectangle for status badge
        pdf.rect(xPos + 2, textY - 3, statusWidth, 6, 'F')

        // Status text
        pdf.setTextColor(statusRgb.r, statusRgb.g, statusRgb.b)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.text(statusText, xPos + 4, textY)

        yPosition += ROW_MIN_HEIGHT
        rowIndex++
      }
    }

    // Add page footers
    const totalPages = pdf.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)

      // Footer line
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.3)
      pdf.line(MARGIN, A4_HEIGHT - 15, A4_WIDTH - MARGIN, A4_HEIGHT - 15)

      // Page number
      setColor(COLORS.secondary)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Page ${i} of ${totalPages}`, A4_WIDTH / 2, A4_HEIGHT - 10, { align: 'center' })

      // Project info on left
      pdf.setFontSize(8)
      pdf.text(project.code, MARGIN, A4_HEIGHT - 10)

      // Date on right
      pdf.text(format(new Date(), 'yyyy-MM-dd'), A4_WIDTH - MARGIN, A4_HEIGHT - 10, {
        align: 'right',
      })
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
