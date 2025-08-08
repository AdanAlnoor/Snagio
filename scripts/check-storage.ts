import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkAndSetupStorage() {
  console.log('🔍 Checking Supabase storage configuration...')
  
  try {
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return
    }

    console.log('📦 Existing buckets:', buckets?.map(b => b.name).join(', ') || 'none')

    const bucketExists = buckets?.some(bucket => bucket.name === 'snag-photos')

    if (!bucketExists) {
      console.log('📦 Creating snag-photos bucket...')
      
      const { data, error: createError } = await supabase.storage.createBucket('snag-photos', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/jpeg', 
          'image/jpg',
          'image/png', 
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif'
        ],
      })

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message)
        return
      }
      
      console.log('✅ Bucket created successfully:', data)
    } else {
      console.log('✅ Bucket snag-photos already exists')
      
      // Get bucket details
      const { data: bucket, error: bucketError } = await supabase.storage.getBucket('snag-photos')
      
      if (!bucketError && bucket) {
        console.log('📊 Bucket configuration:')
        console.log('  - Public:', bucket.public)
        console.log('  - File size limit:', bucket.file_size_limit ? `${(bucket.file_size_limit / 1024 / 1024).toFixed(2)}MB` : 'none')
        console.log('  - Allowed MIME types:', bucket.allowed_mime_types?.join(', ') || 'all')
      }
    }

    // Test upload permissions
    console.log('\n🧪 Testing upload permissions...')
    const testFileName = `test-${Date.now()}.txt`
    const { error: uploadError } = await supabase.storage
      .from('snag-photos')
      .upload(testFileName, 'test content', {
        contentType: 'text/plain',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message)
      console.log('⚠️  Make sure RLS policies are configured correctly for the storage bucket')
    } else {
      console.log('✅ Upload test successful')
      
      // Clean up test file
      await supabase.storage.from('snag-photos').remove([testFileName])
      console.log('🧹 Test file cleaned up')
    }

    console.log('\n✅ Storage check complete!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAndSetupStorage()