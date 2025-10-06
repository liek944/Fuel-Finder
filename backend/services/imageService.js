const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../database/db");
const {
  processAndUploadImage,
  deleteImageFiles,
} = require("./supabaseStorage");

// Configure multer for memory storage (we'll process and save manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP) are allowed"), false);
    }
  },
});

// Ensure upload directories exist
async function ensureUploadDirectories() {
  const dirs = [
    "uploads/images/stations",
    "uploads/images/pois",
    "uploads/images/thumbnails",
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }
}

// Initialize directories on module load
ensureUploadDirectories().catch(console.error);

// Process and save image
async function processAndSaveImage(
  fileBuffer,
  originalFilename,
  targetType = "station",
) {
  const fileExtension = path.extname(originalFilename).toLowerCase();
  const filename = `${uuidv4()}${fileExtension}`;
  const thumbnailFilename = `thumb_${filename}`;

  const imagePath = path.join("uploads/images", `${targetType}s`, filename);
  const thumbnailPath = path.join(
    "uploads/images/thumbnails",
    thumbnailFilename,
  );

  try {
    // Process main image (optimize and resize if too large)
    const imageProcessor = sharp(fileBuffer);
    const metadata = await imageProcessor.metadata();

    let processedImage = imageProcessor;

    // Resize if image is too large (max 1920px width, maintain aspect ratio)
    if (metadata.width > 1920) {
      processedImage = processedImage.resize(1920, null, {
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    // Optimize and save main image
    await processedImage
      .jpeg({ quality: 85, progressive: true })
      .toFile(imagePath);

    // Create and save thumbnail (300px width, maintain aspect ratio)
    await sharp(fileBuffer)
      .resize(300, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Get final image stats
    const finalStats = await fs.stat(imagePath);
    const processedMetadata = await sharp(imagePath).metadata();

    return {
      filename,
      originalFilename,
      mimetype: "image/jpeg", // We convert all to JPEG
      size: finalStats.size,
      width: processedMetadata.width,
      height: processedMetadata.height,
      thumbnailFilename,
    };
  } catch (error) {
    console.error("Error processing image:", error);

    // Clean up any partially created files
    try {
      await fs.unlink(imagePath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});
    } catch (cleanupError) {
      console.error("Error cleaning up files:", cleanupError);
    }

    throw error;
  }
}

// Save image metadata to database (with Supabase URLs)
async function saveImageToDatabase(
  imageData,
  stationId = null,
  poiId = null,
  displayOrder = 0,
  isPrimary = false,
  altText = "",
) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      INSERT INTO images (
        filename, original_filename, mime_type, size, width, height,
        station_id, poi_id, display_order, is_primary, alt_text,
        image_url, thumbnail_url, storage_path, thumbnail_storage_path,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING *
    `,
      [
        imageData.filename,
        imageData.originalFilename,
        imageData.mimetype,
        imageData.size,
        imageData.width,
        imageData.height,
        stationId,
        poiId,
        displayOrder,
        isPrimary,
        altText,
        imageData.imageUrl || null,
        imageData.thumbnailUrl || null,
        imageData.storagePath || null,
        imageData.thumbnailStoragePath || null,
      ],
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

// Get images for a station
async function getStationImages(stationId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT * FROM images
      WHERE station_id = $1
      ORDER BY is_primary DESC, display_order ASC, created_at ASC
    `,
      [stationId],
    );

    return result.rows.map((image) => ({
      ...image,
      // Use Supabase URLs if available, fallback to local paths
      imageUrl: image.image_url || `/api/images/stations/${image.filename}`,
      thumbnailUrl: image.thumbnail_url || `/api/images/thumbnails/thumb_${image.filename}`,
    }));
  } finally {
    client.release();
  }
}

// Get images for a POI
async function getPoiImages(poiId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT * FROM images
      WHERE poi_id = $1
      ORDER BY is_primary DESC, display_order ASC, created_at ASC
    `,
      [poiId],
    );

    return result.rows.map((image) => ({
      ...image,
      // Use Supabase URLs if available, fallback to local paths
      imageUrl: image.image_url || `/api/images/pois/${image.filename}`,
      thumbnailUrl: image.thumbnail_url || `/api/images/thumbnails/thumb_${image.filename}`,
    }));
  } finally {
    client.release();
  }
}

// Delete image and its files
async function deleteImage(imageId) {
  const client = await pool.connect();
  try {
    // Get image info first
    const result = await client.query("SELECT * FROM images WHERE id = $1", [
      imageId,
    ]);
    if (result.rows.length === 0) {
      throw new Error("Image not found");
    }

    const image = result.rows[0];

    // Delete from database
    await client.query("DELETE FROM images WHERE id = $1", [imageId]);

    // Delete from Supabase Storage if storage paths exist
    if (image.storage_path && image.thumbnail_storage_path) {
      try {
        await deleteImageFiles(image.storage_path, image.thumbnail_storage_path);
      } catch (storageError) {
        console.warn("Warning: Could not delete from Supabase Storage:", storageError.message);
      }
    } else {
      // Fallback: Delete local files (for backward compatibility)
      const targetType = image.station_id ? "station" : "poi";
      const imagePath = path.join(
        "uploads/images",
        `${targetType}s`,
        image.filename,
      );
      const thumbnailPath = path.join(
        "uploads/images/thumbnails",
        `thumb_${image.filename}`,
      );

      try {
        await fs.unlink(imagePath);
        await fs.unlink(thumbnailPath);
      } catch (fileError) {
        console.warn("Warning: Could not delete local image files:", fileError.message);
      }
    }

    return image;
  } finally {
    client.release();
  }
}

// Set image as primary
async function setPrimaryImage(imageId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get the image to determine if it's for a station or POI
    const imageResult = await client.query(
      "SELECT station_id, poi_id FROM images WHERE id = $1",
      [imageId],
    );
    if (imageResult.rows.length === 0) {
      throw new Error("Image not found");
    }

    const { station_id, poi_id } = imageResult.rows[0];

    // Clear existing primary flag for the same entity
    if (station_id) {
      await client.query(
        "UPDATE images SET is_primary = false WHERE station_id = $1",
        [station_id],
      );
    } else if (poi_id) {
      await client.query(
        "UPDATE images SET is_primary = false WHERE poi_id = $1",
        [poi_id],
      );
    }

    // Set new primary image
    const result = await client.query(
      "UPDATE images SET is_primary = true, updated_at = NOW() WHERE id = $1 RETURNING *",
      [imageId],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Update image display order
async function updateImageOrder(imageId, displayOrder) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      UPDATE images
      SET display_order = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      [displayOrder, imageId],
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

// Upload multiple images (multipart uploads)
async function uploadImages(files, stationId = null, poiId = null) {
  const results = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      // Process and upload to Supabase
      const imageData = await processAndUploadImage(
        file.buffer,
        file.originalname,
        stationId,
        poiId,
      );
      
      const savedImage = await saveImageToDatabase(
        imageData,
        stationId,
        poiId,
        i, // display_order
        i === 0, // first image is primary by default
      );

      results.push({
        ...savedImage,
        imageUrl: savedImage.image_url || imageData.imageUrl,
        thumbnailUrl: savedImage.thumbnail_url || imageData.thumbnailUrl,
      });
    } catch (error) {
      console.error(`Error processing file ${file.originalname}:`, error);
      errors.push({
        filename: file.originalname,
        error: error.message,
      });
    }
  }

  return { results, errors };
}

// Process base64 encoded image (now uses Supabase Storage)
async function processBase64Image(
  base64Data,
  originalFilename,
  stationId = null,
  poiId = null,
) {
  try {
    // Extract mime type and data from base64 string
    let mimeType = "image/jpeg";
    let imageData = base64Data;

    // Check if it includes the data URL prefix
    if (base64Data.startsWith("data:")) {
      const [header, data] = base64Data.split(",");
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      imageData = data;
    }

    // Validate mime type
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimes.includes(mimeType)) {
      throw new Error(
        "Invalid image format. Only JPEG, PNG, and WebP are allowed.",
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, "base64");

    // Validate buffer size (10MB limit)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error("Image too large. Maximum size is 10MB.");
    }

    // Generate filename if not provided
    const filename = originalFilename || `image_${Date.now()}.jpg`;

    // Process and upload to Supabase Storage
    return await processAndUploadImage(buffer, filename, stationId, poiId);
  } catch (error) {
    console.error("Error processing base64 image:", error);
    throw error;
  }
}

// Upload multiple base64 images
async function uploadBase64Images(
  base64Images,
  stationId = null,
  poiId = null,
) {
  console.log(
    `🔄 uploadBase64Images called with ${base64Images.length} images, stationId: ${stationId}, poiId: ${poiId}`,
  );

  const results = [];
  const errors = [];

  // Get current max display_order and check if there are existing images
  const client = await pool.connect();
  let maxDisplayOrder = -1;
  let hasExistingImages = false;

  try {
    const existingImagesQuery = stationId
      ? "SELECT MAX(display_order) as max_order, COUNT(*) as count FROM images WHERE station_id = $1"
      : "SELECT MAX(display_order) as max_order, COUNT(*) as count FROM images WHERE poi_id = $1";

    const existingResult = await client.query(existingImagesQuery, [
      stationId || poiId,
    ]);
    if (existingResult.rows[0]) {
      maxDisplayOrder = existingResult.rows[0].max_order || -1;
      hasExistingImages = parseInt(existingResult.rows[0].count) > 0;
    }
  } finally {
    client.release();
  }

  console.log(
    `📊 Existing images info - maxDisplayOrder: ${maxDisplayOrder}, hasExisting: ${hasExistingImages}`,
  );

  for (let i = 0; i < base64Images.length; i++) {
    const imageData = base64Images[i];
    const calculatedDisplayOrder = maxDisplayOrder + 1 + i;
    const willBePrimary = !hasExistingImages && i === 0;

    console.log(`📸 Processing image ${i + 1}/${base64Images.length}:`, {
      hasBase64: !!imageData.base64,
      filename: imageData.filename,
      base64Length: imageData.base64 ? imageData.base64.length : 0,
      calculatedDisplayOrder,
      willBePrimary,
    });

    try {
      const filename = imageData.filename || `image_${Date.now()}_${i}.jpg`;

      // Process and upload to Supabase
      const processedImage = await processBase64Image(
        imageData.base64,
        filename,
        stationId,
        poiId,
      );

      // Save to database with Supabase URLs
      const savedImage = await saveImageToDatabase(
        processedImage,
        stationId,
        poiId,
        calculatedDisplayOrder, // display_order starts from max existing + 1
        willBePrimary, // only first image is primary if no existing images
        imageData.altText || "",
      );

      results.push({
        ...savedImage,
        imageUrl: savedImage.image_url || processedImage.imageUrl,
        thumbnailUrl: savedImage.thumbnail_url || processedImage.thumbnailUrl,
      });
      console.log(
        `✅ Successfully processed image ${i + 1}: ${savedImage.filename}`,
        {
          savedImageId: savedImage.id,
          displayOrder: savedImage.display_order,
          isPrimary: savedImage.is_primary,
          imageUrl: savedImage.image_url,
          supabaseStorage: !!savedImage.storage_path,
        },
      );
    } catch (error) {
      console.error(`❌ Error processing base64 image ${i + 1}:`, error);
      errors.push({
        index: i,
        filename: imageData.filename || `image_${i}`,
        error: error.message,
      });
    }
  }

  console.log(
    `🏁 uploadBase64Images completed: ${results.length} success, ${errors.length} errors`,
  );
  return { results, errors };
}

// Helper function to validate base64 image
function validateBase64Image(base64String) {
  try {
    // Check if it's a valid base64 string
    if (!base64String || typeof base64String !== "string") {
      return false;
    }

    // Remove data URL prefix if present
    let data = base64String;
    if (base64String.startsWith("data:")) {
      const parts = base64String.split(",");
      if (parts.length !== 2) {
        return false;
      }
      data = parts[1];
    }

    // Try to decode
    const buffer = Buffer.from(data, "base64");
    return buffer.length > 0;
  } catch (error) {
    return false;
  }
}

module.exports = {
  upload,
  processAndSaveImage,
  saveImageToDatabase,
  getStationImages,
  getPoiImages,
  deleteImage,
  setPrimaryImage,
  updateImageOrder,
  uploadImages,
  processBase64Image,
  uploadBase64Images,
  validateBase64Image,
  ensureUploadDirectories,
};
