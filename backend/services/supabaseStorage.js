const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "station-images";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "⚠️ Supabase credentials not configured. Image uploads will fail.",
  );
  console.warn("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Process image: resize, optimize, and create thumbnail
 * Returns buffers for both main image and thumbnail
 */
async function processImage(fileBuffer) {
  try {
    const imageProcessor = sharp(fileBuffer);
    const metadata = await imageProcessor.metadata();

    // Process main image (optimize and resize if too large)
    let processedImage = imageProcessor;

    // Resize if image is too large (max 1920px width, maintain aspect ratio)
    if (metadata.width > 1920) {
      processedImage = processedImage.resize(1920, null, {
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    // Convert to JPEG and optimize
    const mainImageBuffer = await processedImage
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Create thumbnail (300px width, maintain aspect ratio)
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(300, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Get processed image metadata
    const processedMetadata = await sharp(mainImageBuffer).metadata();

    return {
      mainImageBuffer,
      thumbnailBuffer,
      width: processedMetadata.width,
      height: processedMetadata.height,
      size: mainImageBuffer.length,
    };
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Upload image to Supabase Storage
 * @param {Buffer} imageBuffer - Image buffer to upload
 * @param {string} filePath - Path in bucket (e.g., "station-3/image-uuid.jpeg")
 * @param {string} contentType - MIME type (default: image/jpeg)
 * @returns {Promise<{publicUrl: string, filePath: string}>}
 */
async function uploadToSupabase(
  imageBuffer,
  filePath,
  contentType = "image/jpeg",
) {
  if (!supabase) {
    throw new Error(
      "Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType,
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to get public URL from Supabase");
    }

    console.log(`✅ Uploaded to Supabase: ${filePath}`);

    return {
      publicUrl: urlData.publicUrl,
      filePath: data.path,
    };
  } catch (error) {
    console.error("Error uploading to Supabase:", error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} filePath - Path in bucket to delete
 * @returns {Promise<boolean>}
 */
async function deleteFromSupabase(filePath) {
  if (!supabase) {
    console.warn("Supabase client not initialized. Cannot delete file.");
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error(`Failed to delete ${filePath}:`, error);
      return false;
    }

    console.log(`🗑️ Deleted from Supabase: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error deleting from Supabase:`, error);
    return false;
  }
}

/**
 * Process and upload image to Supabase Storage
 * @param {Buffer} fileBuffer - Image buffer
 * @param {string} originalFilename - Original filename
 * @param {number} stationId - Station ID (for folder organization)
 * @param {number} poiId - POI ID (for folder organization)
 * @returns {Promise<Object>} Image metadata with Supabase URLs
 */
async function processAndUploadImage(
  fileBuffer,
  originalFilename,
  stationId = null,
  poiId = null,
) {
  try {
    // Process the image
    const {
      mainImageBuffer,
      thumbnailBuffer,
      width,
      height,
      size,
    } = await processImage(fileBuffer);

    // Generate unique filename
    const fileExtension = ".jpeg"; // We always convert to JPEG
    const uniqueId = uuidv4();
    const filename = `${uniqueId}${fileExtension}`;
    const thumbnailFilename = `thumb_${filename}`;

    // Determine folder path based on entity type
    let folderPath;
    if (stationId) {
      folderPath = `station-${stationId}`;
    } else if (poiId) {
      folderPath = `poi-${poiId}`;
    } else {
      folderPath = "misc"; // Fallback folder
    }

    // Upload main image
    const mainImagePath = `${folderPath}/${filename}`;
    const mainUploadResult = await uploadToSupabase(
      mainImageBuffer,
      mainImagePath,
      "image/jpeg",
    );

    // Upload thumbnail
    const thumbnailPath = `${folderPath}/${thumbnailFilename}`;
    const thumbnailUploadResult = await uploadToSupabase(
      thumbnailBuffer,
      thumbnailPath,
      "image/jpeg",
    );

    return {
      filename,
      originalFilename,
      imageUrl: mainUploadResult.publicUrl,
      thumbnailUrl: thumbnailUploadResult.publicUrl,
      storagePath: mainImagePath,
      thumbnailStoragePath: thumbnailPath,
      mimetype: "image/jpeg",
      size,
      width,
      height,
    };
  } catch (error) {
    console.error("Error in processAndUploadImage:", error);
    throw error;
  }
}

/**
 * Delete image and thumbnail from Supabase Storage
 * @param {string} storagePath - Main image storage path
 * @param {string} thumbnailStoragePath - Thumbnail storage path
 * @returns {Promise<{success: boolean, errors: Array}>}
 */
async function deleteImageFiles(storagePath, thumbnailStoragePath) {
  const errors = [];

  // Delete main image
  const mainDeleted = await deleteFromSupabase(storagePath);
  if (!mainDeleted) {
    errors.push(`Failed to delete main image: ${storagePath}`);
  }

  // Delete thumbnail
  const thumbDeleted = await deleteFromSupabase(thumbnailStoragePath);
  if (!thumbDeleted) {
    errors.push(`Failed to delete thumbnail: ${thumbnailStoragePath}`);
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Verify Supabase connection and bucket existence
 * @returns {Promise<{connected: boolean, bucket: boolean, message: string}>}
 */
async function verifySupabaseConnection() {
  if (!supabase) {
    return {
      connected: false,
      bucket: false,
      message: "Supabase client not initialized",
    };
  }

  try {
    // Try to list buckets to verify connection
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      return {
        connected: false,
        bucket: false,
        message: `Connection failed: ${error.message}`,
      };
    }

    // Check if our bucket exists
    const bucketExists = data.some((bucket) => bucket.name === bucketName);

    return {
      connected: true,
      bucket: bucketExists,
      message: bucketExists
        ? `Connected and bucket '${bucketName}' exists`
        : `Connected but bucket '${bucketName}' not found`,
    };
  } catch (error) {
    return {
      connected: false,
      bucket: false,
      message: `Error: ${error.message}`,
    };
  }
}

module.exports = {
  processImage,
  uploadToSupabase,
  deleteFromSupabase,
  processAndUploadImage,
  deleteImageFiles,
  verifySupabaseConnection,
  supabase,
  bucketName,
};
