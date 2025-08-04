import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Skip auth check for public routes and API routes that don't need auth
  const publicRoutes = ['/', '/login', '/register', '/reset-password']
  const pathname = request.nextUrl.pathname

  // Check if this is a public route
  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith('/api/auth/') || pathname.includes('.') // Skip for files with extensions (images, css, etc)

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip auth check for public routes
  if (isPublicRoute) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set({ name, value })
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // no user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the response object as it is.
  // If you're trying to modify the response, do it above.
  return response
}
