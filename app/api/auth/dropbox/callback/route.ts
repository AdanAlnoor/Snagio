import { NextRequest, NextResponse } from 'next/server'
import { DropboxAuth } from 'dropbox'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
  }

  try {
    const auth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY!,
      clientSecret: process.env.DROPBOX_APP_SECRET!,
    })

    // Set redirect URI
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/dropbox/callback`
    
    // Exchange code for tokens
    const tokenResponse = await auth.getAccessTokenFromCode(redirectUri, code)
    
    // Get the tokens
    const accessToken = tokenResponse.result.access_token
    const refreshToken = tokenResponse.result.refresh_token
    
    // Create an HTML page that displays the tokens
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dropbox Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #0061ff;
              margin-bottom: 20px;
            }
            .token-box {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 15px;
              margin: 15px 0;
              word-break: break-all;
              font-family: monospace;
              font-size: 12px;
            }
            .label {
              font-weight: bold;
              color: #495057;
              margin-bottom: 5px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 14px;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              color: #856404;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .success {
              background: #d4edda;
              border: 1px solid #28a745;
              color: #155724;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            button {
              background: #0061ff;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              margin-right: 10px;
            }
            button:hover {
              background: #0052d9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Dropbox Authentication Successful!</h1>
            
            <div class="success">
              Your Dropbox app has been successfully authenticated. Copy the tokens below and add them to your <code>.env.local</code> file.
            </div>

            <div class="token-box">
              <div class="label">Access Token (temporary, expires in 4 hours):</div>
              <div id="access-token">${accessToken}</div>
              <button onclick="copyToClipboard('access-token')">Copy Access Token</button>
            </div>

            ${refreshToken ? `
              <div class="token-box">
                <div class="label">Refresh Token (permanent, use this for production):</div>
                <div id="refresh-token">${refreshToken}</div>
                <button onclick="copyToClipboard('refresh-token')">Copy Refresh Token</button>
              </div>
            ` : ''}

            <div class="warning">
              <strong>Important:</strong> 
              <ol>
                <li>Copy these tokens to your <code>.env.local</code> file</li>
                <li>Update <code>DROPBOX_ACCESS_TOKEN</code> with the access token</li>
                ${refreshToken ? '<li>Update <code>DROPBOX_REFRESH_TOKEN</code> with the refresh token</li>' : ''}
                <li>Keep these tokens secret and never commit them to version control</li>
              </ol>
            </div>

            <div style="margin-top: 30px;">
              <button onclick="window.close()">Close Window</button>
              <button onclick="window.location.href='/projects'">Go to Projects</button>
            </div>
          </div>

          <script>
            function copyToClipboard(elementId) {
              const element = document.getElementById(elementId);
              const text = element.textContent;
              navigator.clipboard.writeText(text).then(() => {
                alert('Token copied to clipboard!');
              }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Token copied to clipboard!');
              });
            }
          </script>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error: any) {
    console.error('Token exchange error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to exchange code for tokens',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}