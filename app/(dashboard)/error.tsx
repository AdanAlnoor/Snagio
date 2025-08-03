'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
        <p className="text-gray-600">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && <p className="text-sm text-gray-500">Error ID: {error.digest}</p>}
        <div className="pt-4">
          <Button onClick={reset} className="mr-2">
            Try again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/projects')}>
            Go to Projects
          </Button>
        </div>
      </div>
    </div>
  )
}
