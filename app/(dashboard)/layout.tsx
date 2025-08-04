import { redirect } from 'next/navigation'
import { ResponsiveLayout } from '@/components/layout/responsive-layout'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user profile exists in database
  let userProfile = await prisma.user.findUnique({
    where: { id: user.id },
  })

  // If profile doesn't exist, create it with basic info from auth
  if (!userProfile) {
    try {
      const metadata = user.user_metadata || {}
      userProfile = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || '',
          firstName: metadata.first_name || metadata.firstName || 'User',
          lastName: metadata.last_name || metadata.lastName || '',
          company: metadata.company || '',
          role: 'INSPECTOR',
        },
      })
    } catch (_error) {
      // If we still can't create the profile, redirect to an error page
      redirect('/login?error=profile_creation_failed')
    }
  }

  // Pass only serializable user data to client component
  const userData = {
    id: user.id,
    email: user.email || '',
  }

  return <ResponsiveLayout user={userData}>{children}</ResponsiveLayout>
}
