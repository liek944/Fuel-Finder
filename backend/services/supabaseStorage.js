const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'station-images';

let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('🔗 Supabase Storage client initialized');
} else {
  console.warn('⚠️  Supabase Storage not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Verify Supabase Storage connection
 */
async function verifySupabaseConnection() {
  if (!supabase) {
    return {
      connected: false,
      bucket: null,
      message: 'Supabase client not initialized - check environment variables'
    };
  }

  try {
    // Try to list buckets to verify connection
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Supabase Storage connection failed:', error.message);
      return {
        connected: false,
        bucket: storageBucket,
        message: `Connection failed: ${error.message}`
      };
    }

    // Check if our bucket exists
    const bucketExists = data.some(bucket => bucket.name === storageBucket);
    
    if (!bucketExists) {
      console.warn(`⚠️  Storage bucket '${storageBucket}' not found`);
      return {
        connected: true,
        bucket: storageBucket,
        message: `Bucket '${storageBucket}' not found`
      };
    }

    console.log(`✅ Supabase Storage connected - bucket: ${storageBucket}`);
    return {
      connected: true,
      bucket: storageBucket,
      message: 'Connected successfully'
    };
  } catch (error) {
    console.error('❌ Error verifying Supabase Storage:', error);
    return {
      connected: false,
      bucket: storageBucket,
      message: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Upload image buffer to Supabase Storage
 * @param {Buffer} buffer - Image buffer
 * @param {string} filename - Filename for the image
 * @param {string} folder - Folder path (e.g., 'stations', 'pois', 'thumbnails')
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadImageToSupabase(buffer, filename, folder = 'stations') {
  if (!supabase) {
    throw new Error('Supabase Storage not configured');
  }

  const filePath = `${folder}/${filename}`;
  
  try {
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true // Allow overwriting existing files
      });

    if (error) {
      console.error(`❌ Failed to upload ${filePath}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(filePath);

    console.log(`✅ Uploaded ${filePath} to Supabase Storage`);
    
    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} filePath - Full path to the file in storage
 */
async function deleteImageFromSupabase(filePath) {
  if (!supabase) {
    throw new Error('Supabase Storage not configured');
  }

  try {
    const { error } = await supabase.storage
      .from(storageBucket)
      .remove([filePath]);

    if (error) {
      console.error(`❌ Failed to delete ${filePath}:`, error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log(`🗑️ Deleted ${filePath} from Supabase Storage`);
  } catch (error) {
    console.error(`❌ Error deleting ${filePath}:`, error);
    throw error;
  }
}

/**
 * Get public URL for a file in Supabase Storage
 * @param {string} filePath - Path to the file
 * @returns {string} Public URL
 */
function getSupabaseImageUrl(filePath) {
  if (!supabase) {
    return null;
  }

  const { data } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Check if Supabase Storage is configured and available
 */
function isSupabaseStorageAvailable() {
  return !!supabase;
}

module.exports = {
  verifySupabaseConnection,
  uploadImageToSupabase,
  deleteImageFromSupabase,
  getSupabaseImageUrl,
  isSupabaseStorageAvailable,
  supabase,
  storageBucket
};
