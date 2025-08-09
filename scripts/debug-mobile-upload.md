# Mobile Upload Debug Guide

## Common Issues & Solutions

### 1. iOS HEIC/HEIF Format Issues
Modern iPhones capture photos in HEIC format by default, which may not be properly handled.

**Solution:** Check your iPhone settings:
- Settings > Camera > Formats > Choose "Most Compatible" (JPEG)

### 2. Canvas API Issues on Mobile
The image compression uses Canvas API which might fail on some mobile browsers.

**Debug Steps:**
1. Open browser console on mobile (or use remote debugging)
2. Look for these errors:
   - "Failed to get canvas context"
   - "Failed to compress image"
   - Canvas-related errors

### 3. File Size & Network Issues
Mobile uploads may fail due to:
- Slow network connections
- Request timeouts
- Large file sizes

### 4. Debugging on Mobile

#### For iOS (Safari):
1. On iPhone: Settings > Safari > Advanced > Web Inspector = ON
2. Connect iPhone to Mac via USB
3. On Mac Safari: Develop menu > [Your iPhone] > [localhost]
4. Check Console for errors during upload

#### For Android (Chrome):
1. Enable Developer mode on Android
2. Connect via USB with debugging enabled
3. On desktop Chrome: chrome://inspect
4. Click "inspect" next to your device
5. Check Console tab for errors

### 5. Quick Test

Try these in order:
1. **Test with a small screenshot** (not a camera photo)
2. **Test with a downloaded JPEG** (not HEIC)
3. **Test without compression** (temporarily disable in code)
4. **Check Dropbox directly** at dropbox.com/home/Snagio

### 6. What to Look For in Console

When uploading from mobile, you should see:
```
Uploading file: {name: "...", size: "...MB", type: "image/jpeg", wasCompressed: false/true}
```

If upload succeeds, check the response for:
- `storage: "dropbox"` (confirms Dropbox was used)
- `url: "https://dl.dropboxusercontent.com/..."` (the Dropbox URL)

### 7. Common Error Messages

- **"Failed to upload file to Dropbox"** - Check access token hasn't expired
- **"File too large"** - File exceeds 20MB even after compression
- **"Failed to compress image"** - Canvas API issue, try without compression
- **No error but no file in Dropbox** - Check the folder path in Dropbox

### 8. Temporary Workaround

If compression is causing issues, temporarily disable it:
1. In PhotoUploader.tsx, change line 51:
   ```typescript
   if (needsCompression(file, 15)) {
   ```
   to:
   ```typescript
   if (false) { // Temporarily disabled
   ```

This will upload original files without compression.