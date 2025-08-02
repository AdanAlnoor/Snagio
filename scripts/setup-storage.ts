import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupStorage() {
  try {
    // Create the snag-photos bucket
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'snag-photos')
    
    if (!bucketExists) {
      console.log('Creating snag-photos bucket...')
      const { error: createError } = await supabase.storage.createBucket('snag-photos', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      })

      if (createError) {
        console.error('Error creating bucket:', createError)
        return
      }
      console.log('✅ Created snag-photos bucket')
    } else {
      console.log('✅ snag-photos bucket already exists')
    }

    // Set up storage policies (RLS)
    // Note: These policies need to be created in the Supabase dashboard
    // as the JS client doesn't support creating storage policies
    console.log(`
Storage Policy Setup Instructions:
1. Go to your Supabase dashboard
2. Navigate to Storage > Policies
3. Create the following policies for the 'snag-photos' bucket:

SELECT Policy (View photos):
- Policy name: "Authenticated users can view photos"
- Target roles: authenticated
- WITH CHECK expression: true

INSERT Policy (Upload photos):
- Policy name: "Users can upload photos for their projects"
- Target roles: authenticated
- WITH CHECK expression: auth.uid() IS NOT NULL

UPDATE Policy (Update photos):
- Policy name: "Users can update their photos"
- Target roles: authenticated
- USING expression: auth.uid() IS NOT NULL
- WITH CHECK expression: auth.uid() IS NOT NULL

DELETE Policy (Delete photos):
- Policy name: "Users can delete their photos"
- Target roles: authenticated
- USING expression: auth.uid() IS NOT NULL
`)

  } catch (error) {
    console.error('Setup error:', error)
  }
}

setupStorage()