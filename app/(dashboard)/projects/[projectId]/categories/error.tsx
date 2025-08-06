'use client'

import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CategoriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Categories page error:', error)
  }, [error])

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto mt-16">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle>Something went wrong!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            We encountered an error while loading the categories. This might be a temporary issue.
          </p>
          {error.message && (
            <div className="p-3 bg-red-50 rounded-md">
              <p className="text-sm text-red-800">{error.message}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
