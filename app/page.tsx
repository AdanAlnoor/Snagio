import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createServerClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/projects')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-4xl font-bold text-orange-600">
        Welcome to Snagio
      </h1>
      <p className="max-w-2xl text-center text-lg text-gray-600 mb-8">
        Photo-centric inspection and issue tracking system for construction,
        property inspections, quality control, and more.
      </p>
      <div className="flex gap-4">
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline">Create Account</Button>
        </Link>
      </div>
    </div>
  )
}
