import { Dropbox, DropboxAuth } from 'dropbox'

interface UploadResult {
  id: string
  path: string
  url: string
  size: number
}

class DropboxService {
  private dbx: Dropbox | null = null
  private auth: DropboxAuth | null = null
  private isInitialized = false

  private initialize() {
    if (this.isInitialized) return

    if (!process.env.DROPBOX_APP_KEY || !process.env.DROPBOX_APP_SECRET) {
      throw new Error('Dropbox credentials not configured. Please set DROPBOX_APP_KEY and DROPBOX_APP_SECRET in your environment variables.')
    }

    this.auth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    })

    // Use global fetch (available in Node.js 18+ and all modern browsers)
    this.dbx = new Dropbox({
      auth: this.auth,
      fetch: globalThis.fetch.bind(globalThis),
    })

    this.isInitialized = true
  }

  async uploadFile(
    path: string,
    contents: Buffer | ArrayBuffer | Blob,
    contentType?: string
  ): Promise<UploadResult> {
    this.initialize()
    if (!this.dbx) throw new Error('Dropbox client not initialized')

    try {
      // Upload the file
      const uploadResponse = await this.dbx.filesUpload({
        path,
        contents,
        mode: { '.tag': 'add' },
        autorename: true,
        strict_conflict: false,
      })

      // Try to create a shared link
      let shareUrl: string
      try {
        const linkResponse = await this.dbx.sharingCreateSharedLinkWithSettings({
          path: uploadResponse.result.path_display!,
          settings: {
            requested_visibility: { '.tag': 'public' },
            audience: { '.tag': 'public' },
            access: { '.tag': 'viewer' },
          },
        })
        shareUrl = this.convertToDirectLink(linkResponse.result.url)
      } catch (linkError: any) {
        // If link already exists (409 error), get the existing link
        if (linkError?.status === 409) {
          const existingLinks = await this.dbx.sharingListSharedLinks({
            path: uploadResponse.result.path_display!,
            direct_only: true,
          })
          
          if (existingLinks.result.links.length > 0) {
            shareUrl = this.convertToDirectLink(existingLinks.result.links[0].url)
          } else {
            // If no existing link found, throw the original error
            throw linkError
          }
        } else {
          throw linkError
        }
      }

      return {
        id: uploadResponse.result.id,
        path: uploadResponse.result.path_display!,
        url: shareUrl,
        size: uploadResponse.result.size,
      }
    } catch (error: any) {
      console.error('Dropbox upload error:', error)
      throw new Error(`Failed to upload file to Dropbox: ${error?.message || 'Unknown error'}`)
    }
  }

  private convertToDirectLink(shareLink: string): string {
    // Convert Dropbox share link to direct download link
    // Replace www.dropbox.com with dl.dropboxusercontent.com
    // Remove ?dl=0 parameter if present
    return shareLink
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('?dl=0', '')
      .replace('&dl=0', '')
  }

  async deleteFile(path: string): Promise<void> {
    this.initialize()
    if (!this.dbx) throw new Error('Dropbox client not initialized')

    try {
      await this.dbx.filesDeleteV2({ path })
    } catch (error: any) {
      console.error('Dropbox delete error:', error)
      throw new Error(`Failed to delete file from Dropbox: ${error?.message || 'Unknown error'}`)
    }
  }

  async createFolder(path: string): Promise<void> {
    this.initialize()
    if (!this.dbx) throw new Error('Dropbox client not initialized')

    try {
      await this.dbx.filesCreateFolderV2({
        path,
        autorename: false,
      })
    } catch (error: any) {
      // Ignore error if folder already exists
      if (error?.status !== 409) {
        console.error('Dropbox create folder error:', error)
        throw new Error(`Failed to create folder in Dropbox: ${error?.message || 'Unknown error'}`)
      }
    }
  }

  async listFiles(path: string) {
    this.initialize()
    if (!this.dbx) throw new Error('Dropbox client not initialized')

    try {
      const response = await this.dbx.filesListFolder({
        path,
        recursive: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
      })
      return response.result.entries
    } catch (error: any) {
      console.error('Dropbox list files error:', error)
      throw new Error(`Failed to list files from Dropbox: ${error?.message || 'Unknown error'}`)
    }
  }

  async getTemporaryLink(path: string): Promise<string> {
    this.initialize()
    if (!this.dbx) throw new Error('Dropbox client not initialized')

    try {
      const response = await this.dbx.filesGetTemporaryLink({ path })
      return response.result.link
    } catch (error: any) {
      console.error('Dropbox temporary link error:', error)
      throw new Error(`Failed to get temporary link from Dropbox: ${error?.message || 'Unknown error'}`)
    }
  }

  // Helper method to check if service is properly configured
  isConfigured(): boolean {
    return !!(
      process.env.DROPBOX_APP_KEY &&
      process.env.DROPBOX_APP_SECRET &&
      (process.env.DROPBOX_ACCESS_TOKEN || process.env.DROPBOX_REFRESH_TOKEN)
    )
  }
}

// Export singleton instance
export const dropboxService = new DropboxService()