import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
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
      return
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'snag-photos')

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('snag-photos', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      })

      if (createError) {
        return
      }
    } else {
    }
  } catch (_error) {}
}

setupStorage()
