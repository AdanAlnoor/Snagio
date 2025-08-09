# Dropbox Integration Implementation Guide

## Overview
This document provides a complete guide for integrating Dropbox as the primary storage solution for Snagio, replacing Supabase Storage to eliminate storage costs.

## Table of Contents
1. [Prerequisites & Requirements](#prerequisites--requirements)
2. [Required Information from User](#required-information-from-user)
3. [Dropbox App Setup](#dropbox-app-setup)
4. [Implementation Steps](#implementation-steps)
5. [Code Implementation](#code-implementation)
6. [Migration from Supabase](#migration-from-supabase)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites & Requirements

### System Requirements
- Node.js 18+ 
- Next.js 15+ (already installed)
- Dropbox Business or Personal account with sufficient storage
- SSL certificate for OAuth redirect (localhost works for development)

### Required npm Packages
```bash
npm install dropbox isomorphic-unfetch
npm install --save-dev @types/dropbox
```

---

## Required Information from User

### Essential Credentials Checklist

Before starting implementation, you need to gather the following:

#### 1. Dropbox Account Information
- [ ] **Dropbox Account Type**: Business / Personal / Team
- [ ] **Available Storage**: _____ GB/TB
- [ ] **Admin Access**: Yes / No (needed for app creation)
- [ ] **Team ID** (if using Dropbox Business): _____________

#### 2. Dropbox App Credentials (will be created in setup)
- [ ] **App Key**: _________________________________
- [ ] **App Secret**: _________________________________
- [ ] **Access Token**: _________________________________
- [ ] **Refresh Token**: _________________________________

#### 3. Configuration Decisions
- [ ] **Folder Structure Preference**:
  - Option A: `/Snagio/[ProjectName]/[Category]/[SnagNumber]_photo.jpg`
  - Option B: `/Snagio/[ProjectID]/[SnagID]_photo.jpg`
  - Option C: Custom: _________________________________

- [ ] **File Naming Convention**:
  - Option A: `snag_[number]_[timestamp].jpg`
  - Option B: `[projectCode]_[snagNumber]_[date].jpg`
  - Option C: Custom: _________________________________

- [ ] **Storage Limits per Project**:
  - [ ] No limit
  - [ ] Limit to: _____ GB per project

- [ ] **Photo Retention Policy**:
  - [ ] Keep forever
  - [ ] Delete after _____ days
  - [ ] Archive to separate folder after project completion

#### 4. Migration Requirements
- [ ] **Existing Supabase Photos**: _____ GB to migrate
- [ ] **Migration Timeline**: Immediate / Gradual
- [ ] **Keep Supabase as Backup**: Yes / No (for ___ days)

#### 5. Access & Permissions
- [ ] **Who can upload photos**: All users / Project owners only / Custom
- [ ] **Shared folder access**: Team members / Specific users / Public links
- [ ] **API Rate Limits**: Standard / Extended (contact Dropbox)

---

## Dropbox App Setup

### Step 1: Create Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Configure app settings:
   ```
   API: Scoped access
   Access type: Full Dropbox or App folder
   Name: Snagio Storage (must be unique)
   ```

4. After creation, note down:
   - App key
   - App secret

### Step 2: Configure Permissions

In the Permissions tab, enable:
- `files.content.write` - Upload files
- `files.content.read` - Read files
- `sharing.write` - Create shared links
- `sharing.read` - Read shared links
- `files.metadata.write` - Create folders
- `files.metadata.read` - List files

### Step 3: Configure OAuth Redirect URLs

Add these redirect URLs:
```
Development:
http://localhost:3000/api/auth/dropbox/callback

Production:
https://yourdomain.com/api/auth/dropbox/callback
```

### Step 4: Generate Access Tokens

#### For Development (Short-lived token):
1. Go to app settings
2. Click "Generate" under "Generated access token"
3. Copy token (expires in 4 hours)

#### For Production (Refresh token):
1. Use OAuth flow (implemented below)
2. Or use Dropbox SDK to generate refresh token

---

## Implementation Steps

### Phase 1: Environment Setup

#### 1. Update `.env.local`
```env
# Dropbox Configuration
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
DROPBOX_REFRESH_TOKEN=your_refresh_token_here
DROPBOX_ACCESS_TOKEN=temporary_token_for_dev

# Optional Configuration
DROPBOX_FOLDER_PATH=/Snagio
DROPBOX_MAX_FILE_SIZE=10485760  # 10MB in bytes
```

#### 2. Update `.env.example`
```env
# Dropbox Integration (Required for photo storage)
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REFRESH_TOKEN=

# Optional Dropbox Settings
DROPBOX_FOLDER_PATH=/Snagio
DROPBOX_MAX_FILE_SIZE=10485760
```

### Phase 2: Create Dropbox Service

#### 1. Create `/lib/dropbox/client.ts`
```typescript
import { Dropbox, DropboxAuth } from 'dropbox';

class DropboxService {
  private dbx: Dropbox;
  private auth: DropboxAuth;

  constructor() {
    this.auth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY!,
      clientSecret: process.env.DROPBOX_APP_SECRET!,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
    });

    this.dbx = new Dropbox({
      auth: this.auth,
    });
  }

  async uploadFile(
    path: string,
    contents: Buffer | ArrayBuffer,
    contentType: string
  ) {
    try {
      const response = await this.dbx.filesUpload({
        path,
        contents,
        mode: { '.tag': 'add' },
        autorename: true,
        strict_conflict: false,
      });

      // Create shared link
      const linkResponse = await this.dbx.sharingCreateSharedLinkWithSettings({
        path: response.result.path_display!,
        settings: {
          requested_visibility: { '.tag': 'public' },
          audience: { '.tag': 'public' },
          access: { '.tag': 'viewer' },
        },
      });

      return {
        id: response.result.id,
        path: response.result.path_display!,
        url: this.convertToDirectLink(linkResponse.result.url),
        size: response.result.size,
      };
    } catch (error: any) {
      if (error.status === 409) {
        // Link already exists, get existing
        const existingLinks = await this.dbx.sharingListSharedLinks({
          path,
          direct_only: true,
        });
        
        if (existingLinks.result.links.length > 0) {
          return {
            url: this.convertToDirectLink(existingLinks.result.links[0].url),
            path: existingLinks.result.links[0].path_display!,
          };
        }
      }
      throw error;
    }
  }

  private convertToDirectLink(shareLink: string): string {
    // Convert Dropbox share link to direct download link
    return shareLink.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                   .replace('?dl=0', '');
  }

  async deleteFile(path: string) {
    return await this.dbx.filesDeleteV2({ path });
  }

  async createFolder(path: string) {
    try {
      return await this.dbx.filesCreateFolderV2({
        path,
        autorename: false,
      });
    } catch (error: any) {
      if (error.status === 409) {
        // Folder already exists
        return { result: { metadata: { path_display: path } } };
      }
      throw error;
    }
  }

  async listFiles(path: string) {
    return await this.dbx.filesListFolder({
      path,
      recursive: false,
      include_deleted: false,
      include_has_explicit_shared_members: false,
    });
  }

  async getTemporaryLink(path: string) {
    const response = await this.dbx.filesGetTemporaryLink({ path });
    return response.result.link;
  }
}

export const dropboxService = new DropboxService();
```

#### 2. Create `/lib/dropbox/auth.ts`
```typescript
import { DropboxAuth } from 'dropbox';

export async function getDropboxAuthUrl(): Promise<string> {
  const auth = new DropboxAuth({
    clientId: process.env.DROPBOX_APP_KEY!,
  });

  const authUrl = await auth.getAuthenticationUrl(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/dropbox/callback`,
    undefined,
    'code',
    'offline',
    undefined,
    undefined,
    true
  );

  return authUrl as string;
}

export async function handleDropboxCallback(code: string): Promise<string> {
  const auth = new DropboxAuth({
    clientId: process.env.DROPBOX_APP_KEY!,
    clientSecret: process.env.DROPBOX_APP_SECRET!,
  });

  auth.setCodeVerifier(code);
  const response = await auth.getAccessTokenFromCode(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/dropbox/callback`,
    code
  );

  // Save refresh token securely (encrypt before storing)
  const refreshToken = response.result.refresh_token;
  
  return refreshToken!;
}
```

### Phase 3: Update API Routes

#### 1. Update `/app/api/upload/route.ts`
```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { createServerClient } from '@/lib/supabase/server';
import { dropboxService } from '@/lib/dropbox/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'File and projectId are required' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        createdById: user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check file size
    const maxSize = parseInt(process.env.DROPBOX_MAX_FILE_SIZE || '10485760');
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Prepare file for Dropbox
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate organized path
    const timestamp = new Date().toISOString().split('T')[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const dropboxPath = `${process.env.DROPBOX_FOLDER_PATH || '/Snagio'}/${project.name.replace(/[^a-z0-9]/gi, '_')}/${timestamp}/${fileName}`;

    // Upload to Dropbox
    const uploadResult = await dropboxService.uploadFile(
      dropboxPath,
      buffer,
      file.type
    );

    // Create thumbnail (you can implement thumbnail generation here)
    const thumbnailUrl = uploadResult.url; // For now, same as original

    return NextResponse.json({
      id: uuidv4(),
      url: uploadResult.url,
      thumbnailUrl: thumbnailUrl,
      path: uploadResult.path,
      size: uploadResult.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
```

#### 2. Create OAuth callback route `/app/api/auth/dropbox/callback/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleDropboxCallback } from '@/lib/dropbox/auth';
import { prisma } from '@/lib/prisma';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect('/login');
    }

    // Exchange code for refresh token
    const refreshToken = await handleDropboxCallback(code);

    // Store encrypted refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dropboxRefreshToken: refreshToken, // Add this field to User model
      },
    });

    return NextResponse.redirect('/settings?dropbox=connected');
  } catch (error) {
    console.error('Dropbox OAuth error:', error);
    return NextResponse.redirect('/settings?dropbox=error');
  }
}
```

### Phase 4: Update Frontend Components

#### 1. Modify `/components/snags/PhotoUploader.tsx`

No changes needed! The component continues to work the same way, just the backend storage changes.

#### 2. Add Dropbox connection UI in settings

Create `/components/settings/DropboxConnect.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dropbox, CheckCircle, AlertCircle } from 'lucide-react';

export function DropboxConnect({ isConnected }: { isConnected: boolean }) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/auth/dropbox/url');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dropbox className="h-5 w-5" />
          Dropbox Storage
        </CardTitle>
        <CardDescription>
          Connect your Dropbox account to store project photos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Connected to Dropbox</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span>Not connected</span>
            </div>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect Dropbox'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Migration from Supabase

### Step 1: Export Existing Photos

Create `/scripts/export-supabase-photos.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function exportPhotos() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get all photos from database
  const photos = await prisma.snagPhoto.findMany({
    include: {
      snag: {
        include: {
          category: {
            include: {
              project: true,
            },
          },
        },
      },
    },
  });

  const exportDir = './photo-export';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  for (const photo of photos) {
    const projectName = photo.snag.category.project.name;
    const snagNumber = photo.snag.number;
    
    // Download from Supabase
    const { data, error } = await supabase.storage
      .from('snag-photos')
      .download(photo.url);

    if (data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      const filePath = path.join(
        exportDir,
        projectName,
        `snag_${snagNumber}_${photo.id}.jpg`
      );
      
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, buffer);
      
      console.log(`Exported: ${filePath}`);
    }
  }
}

exportPhotos().catch(console.error);
```

### Step 2: Import to Dropbox

Create `/scripts/import-to-dropbox.ts`:
```typescript
import { dropboxService } from '../lib/dropbox/client';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function importToDropbox() {
  const exportDir = './photo-export';
  const projects = fs.readdirSync(exportDir);

  for (const projectName of projects) {
    const projectDir = path.join(exportDir, projectName);
    const files = fs.readdirSync(projectDir);

    for (const file of files) {
      const filePath = path.join(projectDir, file);
      const buffer = fs.readFileSync(filePath);
      
      // Upload to Dropbox
      const dropboxPath = `/Snagio/${projectName}/${file}`;
      const result = await dropboxService.uploadFile(
        dropboxPath,
        buffer,
        'image/jpeg'
      );

      // Update database with new URL
      const photoId = file.match(/snag_\d+_(.+)\.jpg/)?.[1];
      if (photoId) {
        await prisma.snagPhoto.update({
          where: { id: photoId },
          data: {
            url: result.url,
            thumbnailUrl: result.url, // Update if you have separate thumbnails
          },
        });
      }

      console.log(`Imported: ${dropboxPath}`);
    }
  }
}

importToDropbox().catch(console.error);
```

### Step 3: Run Migration

```bash
# 1. Export from Supabase
npm run tsx scripts/export-supabase-photos.ts

# 2. Verify exported files
ls -la ./photo-export

# 3. Import to Dropbox
npm run tsx scripts/import-to-dropbox.ts

# 4. Test photo access in app
npm run dev

# 5. Once verified, delete from Supabase (optional)
```

---

## Testing & Validation

### Test Checklist

#### 1. Upload Tests
- [ ] Upload single photo (<1MB)
- [ ] Upload large photo (5-10MB)
- [ ] Upload multiple photos rapidly
- [ ] Upload with poor connection
- [ ] Upload non-image file (should reject)

#### 2. Display Tests
- [ ] Photos display in snag list
- [ ] Photos display in snag detail
- [ ] Thumbnails load quickly
- [ ] Full images load on click

#### 3. PDF Export Tests
- [ ] PDF includes Dropbox-hosted images
- [ ] PDF generation works offline (cached images)
- [ ] Large projects export correctly

#### 4. Permission Tests
- [ ] Non-owner cannot upload
- [ ] Shared links work without auth
- [ ] Dropbox folder permissions correct

### Performance Benchmarks

| Operation | Target | Actual |
|-----------|--------|--------|
| Photo upload (5MB) | <3s | ___ |
| Thumbnail display | <500ms | ___ |
| PDF export (50 photos) | <10s | ___ |
| Batch upload (10 photos) | <15s | ___ |

---

## Troubleshooting

### Common Issues

#### 1. "Invalid access token"
**Solution**: Refresh token expired or invalid
```typescript
// Manually refresh token
const auth = new DropboxAuth({
  clientId: process.env.DROPBOX_APP_KEY!,
  clientSecret: process.env.DROPBOX_APP_SECRET!,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
});

const newToken = await auth.checkAndRefreshAccessToken();
```

#### 2. "Path/not_found" error
**Solution**: Folder doesn't exist
```typescript
// Create folder structure
await dropboxService.createFolder('/Snagio');
await dropboxService.createFolder(`/Snagio/${projectName}`);
```

#### 3. Slow uploads
**Solution**: Implement chunked uploads for large files
```typescript
// For files > 150MB, use upload sessions
const session = await dbx.filesUploadSessionStart({
  contents: chunk1,
  close: false,
});
// Continue with chunks...
```

#### 4. CORS errors
**Solution**: Use server-side API routes, not direct browser uploads

#### 5. Rate limiting (429 errors)
**Solution**: Implement exponential backoff
```typescript
async function withRetry(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      } else {
        throw error;
      }
    }
  }
}
```

### Debug Mode

Add to `.env.local`:
```env
DROPBOX_DEBUG=true
```

Then check console for detailed logs.

---

## Security Considerations

### 1. Token Storage
- Never commit tokens to git
- Encrypt refresh tokens before database storage
- Use environment variables for sensitive data

### 2. Access Control
- Validate user permissions before upload
- Use scoped Dropbox app permissions
- Implement file size limits

### 3. File Validation
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}

if (file.size > MAX_SIZE) {
  throw new Error('File too large');
}
```

---

## Cost Analysis

### Storage Cost Comparison

| Provider | Storage | Monthly Cost | Annual Cost |
|----------|---------|--------------|-------------|
| Supabase | 100GB | $25 | $300 |
| Supabase | 500GB | $125 | $1,500 |
| Dropbox Business | 3TB+ | $0 (existing) | $0 |

### Bandwidth Savings

- Supabase: $0.09/GB transfer
- Dropbox: $0 (included in plan)

**Estimated Annual Savings**: $1,500 - $5,000+

---

## Support & Resources

### Dropbox Documentation
- [Dropbox API Guide](https://www.dropbox.com/developers/documentation/http/overview)
- [Dropbox SDK for JavaScript](https://github.com/dropbox/dropbox-sdk-js)
- [OAuth 2.0 Guide](https://www.dropbox.com/developers/documentation/http/documentation#oauth2)

### Getting Help
1. Check troubleshooting section above
2. Review Dropbox API status: https://status.dropbox.com/
3. Contact Dropbox developer support
4. Review implementation examples in codebase

---

## Appendix: Environment Variables Template

```env
# Required Dropbox Configuration
DROPBOX_APP_KEY=                    # From Dropbox App Console
DROPBOX_APP_SECRET=                 # From Dropbox App Console  
DROPBOX_REFRESH_TOKEN=              # Generated via OAuth flow

# Optional Configuration
DROPBOX_FOLDER_PATH=/Snagio        # Root folder for all uploads
DROPBOX_MAX_FILE_SIZE=10485760     # Max file size in bytes (10MB)
DROPBOX_AUTO_CREATE_FOLDERS=true   # Auto-create folder structure
DROPBOX_USE_THUMBNAILS=true        # Generate thumbnails
DROPBOX_THUMBNAIL_SIZE=200         # Thumbnail size in pixels
DROPBOX_RETENTION_DAYS=0           # 0 = keep forever
DROPBOX_DEBUG=false                # Enable debug logging
```

---

*Last updated: [Current Date]*
*Version: 1.0.0*