# Dropbox Setup Guide for Snagio

## Quick Setup Steps

### 1. Enable App Permissions

Go to [Dropbox App Console](https://www.dropbox.com/developers/apps) and select your app.

In the **Permissions** tab, enable these scopes:

#### Files
- ✅ `files.content.write` - Required for uploading photos
- ✅ `files.content.read` - Required for reading photos
- ✅ `files.metadata.write` - Required for creating folders
- ✅ `files.metadata.read` - Required for listing files

#### Sharing  
- ✅ `sharing.write` - Required for creating shared links
- ✅ `sharing.read` - Required for reading shared links

Click **Submit** to save the permissions.

### 2. Get New Access Token

After updating permissions, you need a new token:

1. Visit: http://localhost:3001/api/auth/dropbox
2. Authorize the app with the new permissions
3. Copy the access token from the success page
4. Update `DROPBOX_ACCESS_TOKEN` in `.env.local`

### 3. Test the Connection

Run the test script:
```bash
npx tsx scripts/test-dropbox.ts
```

You should see:
```
✅ Dropbox credentials are configured
✅ Folder created or already exists
✅ Test file uploaded successfully
🎉 Dropbox integration test completed successfully!
```

### 4. Test Photo Upload

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Go to a project and create a new snag
3. Upload a photo (up to 20MB)
4. The photo should upload to Dropbox and display correctly

## Configuration

Your current settings in `.env.local`:
```env
DROPBOX_APP_KEY=gpdvgeecx432um4
DROPBOX_APP_SECRET=ty4kmqh6rnuwdqo
DROPBOX_ACCESS_TOKEN=<your-token>
DROPBOX_FOLDER_PATH=/Snagio
DROPBOX_MAX_FILE_SIZE=20971520  # 20MB
```

## File Organization

Photos are organized in Dropbox as:
```
/Snagio/
  ├── Project_Name/
  │   ├── 2025-01-09/
  │   │   ├── abc123.jpg
  │   │   └── def456.jpg
  │   └── 2025-01-10/
  │       └── ghi789.jpg
  └── Another_Project/
      └── 2025-01-09/
          └── jkl012.jpg
```

## Troubleshooting

### "Your app is not permitted to access this endpoint"
- Go to Dropbox App Console > Permissions
- Enable the required scopes listed above
- Get a new access token

### "Invalid access token"  
- Token has expired (they last 4 hours)
- Get a new token via http://localhost:3001/api/auth/dropbox

### "File too large"
- Files over 15MB are automatically compressed
- Maximum file size after compression is 20MB
- If still too large, the file needs manual compression

### Photos not displaying
- Check browser console for CORS errors
- Verify the Dropbox shared links are public
- Check that the URL format is correct (should be dl.dropboxusercontent.com)

## For Production

For production deployment, you should:

1. Get a refresh token (doesn't expire) instead of access token
2. Update the OAuth redirect URL to your production domain
3. Store tokens securely (encrypted environment variables)
4. Consider implementing token refresh logic

## Support

- [Dropbox API Documentation](https://www.dropbox.com/developers/documentation)
- [Dropbox API Explorer](https://dropbox.github.io/dropbox-api-v2-explorer/)
- Check `/scripts/test-dropbox.ts` for testing the connection