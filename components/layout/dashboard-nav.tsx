'use client'

import { FolderOpen, LogOut, Settings, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface DashboardNavProps {
  user: {
    id: string
    email: string
  }
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-white">
      <div className="flex h-16 items-center px-4">
        <Link href="/projects" className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-orange-600">Snagio</h1>
        </Link>

        <div className="ml-auto flex items-center space-x-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <FolderOpen className="h-4 w-4 mr-2" />
              Projects
            </Button>
          </Link>

          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>

          <div className="flex items-center space-x-2 text-sm">
            <UserIcon className="h-4 w-4" />
            <span>{user.email}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
