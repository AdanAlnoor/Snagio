import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

import { dropboxService } from '../lib/dropbox/client'

async function testDropboxConnection() {
  console.log('Testing Dropbox connection...')
  
  try {
    // Check if Dropbox is configured
    if (!dropboxService.isConfigured()) {
      console.error('❌ Dropbox is not configured. Please check your environment variables:')
      console.log('   - DROPBOX_APP_KEY:', process.env.DROPBOX_APP_KEY ? '✓ Set' : '✗ Missing')
      console.log('   - DROPBOX_APP_SECRET:', process.env.DROPBOX_APP_SECRET ? '✓ Set' : '✗ Missing')
      console.log('   - DROPBOX_ACCESS_TOKEN:', process.env.DROPBOX_ACCESS_TOKEN ? '✓ Set' : '✗ Missing')
      console.log('   - DROPBOX_REFRESH_TOKEN:', process.env.DROPBOX_REFRESH_TOKEN ? '✓ Set' : '✗ Missing')
      return
    }
    
    console.log('✅ Dropbox credentials are configured')
    
    // Try to create the Snagio folder
    const folderPath = process.env.DROPBOX_FOLDER_PATH || '/Snagio'
    console.log(`\nCreating folder: ${folderPath}`)
    await dropboxService.createFolder(folderPath)
    console.log('✅ Folder created or already exists')
    
    // Try to list files in the root folder
    console.log('\nListing files in root folder...')
    const files = await dropboxService.listFiles('')
    console.log(`✅ Found ${files.length} items in root folder`)
    
    // Try uploading a test file
    console.log('\nUploading test file...')
    const testContent = Buffer.from('This is a test file from Snagio integration')
    const testPath = `${folderPath}/test-${Date.now()}.txt`
    
    const uploadResult = await dropboxService.uploadFile(
      testPath,
      testContent,
      'text/plain'
    )
    
    console.log('✅ Test file uploaded successfully')
    console.log('   - Path:', uploadResult.path)
    console.log('   - URL:', uploadResult.url)
    console.log('   - Size:', uploadResult.size, 'bytes')
    
    // Clean up - delete the test file
    console.log('\nCleaning up test file...')
    await dropboxService.deleteFile(uploadResult.path)
    console.log('✅ Test file deleted')
    
    console.log('\n🎉 Dropbox integration test completed successfully!')
    console.log('\nConfiguration summary:')
    console.log('   - Max file size:', (parseInt(process.env.DROPBOX_MAX_FILE_SIZE || '20971520') / 1024 / 1024).toFixed(0), 'MB')
    console.log('   - Folder path:', process.env.DROPBOX_FOLDER_PATH || '/Snagio')
    
  } catch (error: any) {
    console.error('\n❌ Dropbox test failed:', error?.message || error)
    console.error('\nDebug information:')
    console.error('   - Error status:', error?.status)
    console.error('   - Error response:', error?.response)
    
    if (error?.status === 401) {
      console.error('\n⚠️  Authentication error. Your access token may have expired.')
      console.error('   Please generate a new access token from the Dropbox App Console.')
    }
  }
}

// Run the test
testDropboxConnection().catch(console.error)