import { NextResponse } from 'next/server'
import { DropboxAuth } from 'dropbox'

export async function GET() {
  try {
    const auth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY!,
    })

    // Generate the authorization URL
    const authUrl = await auth.getAuthenticationUrl(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/dropbox/callback`,
      undefined,
      'code',
      'offline', // Request offline access to get refresh token
      undefined,
      undefined,
      true
    )

    // Redirect to Dropbox OAuth page
    return NextResponse.redirect(authUrl as string)
  } catch (error: any) {
    console.error('Failed to generate auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    )
  }
}