'use client'

import { useEffect, useState } from 'react'
import { DashboardNav } from '@/components/layout/dashboard-nav'
import { BottomNav } from '@/components/mobile/BottomNav'
import { useIsMobile } from '@/hooks/use-media-query'

interface ResponsiveLayoutProps {
  user: {
    id: string
    email: string
  }
  children: React.ReactNode
}

export function ResponsiveLayout({ user, children }: ResponsiveLayoutProps) {
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial mount, render both layouts but hide them with CSS
  // This prevents hydration mismatches
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Show desktop nav by default, hide on mobile with CSS */}
        <div className="hidden lg:block">
          <DashboardNav user={user} />
        </div>

        {/* Main content with both padding classes */}
        <main className="pb-20 pt-0 lg:pb-0 lg:pt-16">{children}</main>

        {/* Show mobile nav by default, hide on desktop with CSS */}
        <div className="block lg:hidden">
          <BottomNav />
        </div>
      </div>
    )
  }

  // After mount, use JavaScript to show/hide based on actual viewport
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop navigation */}
      {!isMobile && <DashboardNav user={user} />}

      {/* Main content with responsive padding */}
      <main className={isMobile ? 'pb-20' : 'pt-16'}>{children}</main>

      {/* Mobile bottom navigation */}
      {isMobile && <BottomNav />}
    </div>
  )
}
