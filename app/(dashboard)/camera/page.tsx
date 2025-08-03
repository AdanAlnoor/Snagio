import { redirect } from 'next/navigation'
import { CameraCapture } from '@/components/mobile/CameraCapture'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

export default async function CameraPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's projects to select where to create the snag
  const projects = await prisma.project.findMany({
    where: {
      createdById: user.id,
    },
    include: {
      categories: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (projects.length === 0) {
    redirect('/projects')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Quick Capture</h1>
        <p className="text-muted-foreground mb-6">Take a photo to quickly create a new snag</p>

        <CameraCapture projects={projects} />
      </div>
    </div>
  )
}
