import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // For upload routes, handle large files specially
  if (request.nextUrl.pathname.startsWith('/api/upload')) {
    // Check content length to prevent oversized requests early
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 15 * 1024 * 1024) {
      return NextResponse.json(
        { 
          error: 'Request too large', 
          details: 'File size exceeds maximum allowed size of 10MB' 
        },
        { status: 413 }
      )
    }
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
