/**
 * Image Controller
 * Handles image upload and retrieval for stations and POIs
 */

const imageService = require("../services/imageService");
const stationRepository = require("../repositories/stationRepository");
const poiRepository = require("../repositories/poiRepository");

/**
 * Upload images for a station (base64)
 */
async function uploadStationImages(req, res) {
  const stationId = parseInt(req.params.id);
  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({ error: "Invalid station ID" });
  }

  // Verify station exists
  const station = await stationRepository.getStationById(stationId);
  if (!station) {
    return res.status(404).json({ error: "Station not found" });
  }

  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }

  if (images.length > 5) {
    return res.status(400).json({ error: "Too many images. Maximum 5 images per upload." });
  }

  // Validate all images have base64 data
  for (let i = 0; i < images.length; i++) {
    if (!images[i].base64 || !imageService.validateBase64Image(images[i].base64)) {
      return res.status(400).json({ 
        error: `Image ${i + 1} contains invalid base64 data` 
      });
    }
  }

  console.log(`📤 Uploading ${images.length} images for station ${stationId}...`);
  const { results, errors } = await imageService.uploadBase64Images(images, stationId, null);

  console.log(`✅ Uploaded ${results.length} images for station ${stationId}`);
  res.status(201).json({
    message: `Successfully uploaded ${results.length} images`,
    images: results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Get images for a station
 */
async function getStationImages(req, res) {
  const stationId = parseInt(req.params.id);
  if (!stationId || isNaN(stationId)) {
    return res.status(400).json({ error: "Invalid station ID" });
  }

  const images = await imageService.getStationImages(stationId);
  res.json({ images });
}

/**
 * Upload images for a POI (base64)
 */
async function uploadPoiImages(req, res) {
  const poiId = parseInt(req.params.id);
  if (!poiId || isNaN(poiId)) {
    return res.status(400).json({ error: "Invalid POI ID" });
  }

  // Verify POI exists
  const poi = await poiRepository.getPoiById(poiId);
  if (!poi) {
    return res.status(404).json({ error: "POI not found" });
  }

  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }

  if (images.length > 5) {
    return res.status(400).json({ error: "Too many images. Maximum 5 images per upload." });
  }

  // Validate all images have base64 data
  for (let i = 0; i < images.length; i++) {
    if (!images[i].base64 || !imageService.validateBase64Image(images[i].base64)) {
      return res.status(400).json({ 
        error: `Image ${i + 1} contains invalid base64 data` 
      });
    }
  }

  console.log(`📤 Uploading ${images.length} images for POI ${poiId}...`);
  const { results, errors } = await imageService.uploadBase64Images(images, null, poiId);

  console.log(`✅ Uploaded ${results.length} images for POI ${poiId}`);
  res.status(201).json({
    message: `Successfully uploaded ${results.length} images`,
    images: results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Get images for a POI
 */
async function getPoiImages(req, res) {
  const poiId = parseInt(req.params.id);
  if (!poiId || isNaN(poiId)) {
    return res.status(400).json({ error: "Invalid POI ID" });
  }

  const images = await imageService.getPoiImages(poiId);
  res.json({ images });
}

/**
 * Delete an image by ID
 */
async function deleteImage(req, res) {
  const imageId = parseInt(req.params.id);
  if (!imageId || isNaN(imageId)) {
    return res.status(400).json({ error: "Invalid image ID" });
  }

  try {
    const deletedImage = await imageService.deleteImage(imageId);
    console.log(`🗑️ Deleted image: ${deletedImage.filename}`);
    res.json({
      success: true,
      message: "Image deleted successfully",
      deletedId: imageId,
    });
  } catch (error) {
    if (error.message === "Image not found") {
      return res.status(404).json({ error: "Image not found" });
    }
    throw error;
  }
}

/**
 * Set image as primary
 */
async function setPrimaryImage(req, res) {
  const imageId = parseInt(req.params.id);
  if (!imageId || isNaN(imageId)) {
    return res.status(400).json({ error: "Invalid image ID" });
  }

  try {
    const updatedImage = await imageService.setPrimaryImage(imageId);
    console.log(`⭐ Set image as primary: ${updatedImage.filename}`);
    res.json({
      success: true,
      message: "Image set as primary successfully",
      image: updatedImage,
    });
  } catch (error) {
    if (error.message === "Image not found") {
      return res.status(404).json({ error: "Image not found" });
    }
    throw error;
  }
}

module.exports = {
  uploadStationImages,
  getStationImages,
  uploadPoiImages,
  getPoiImages,
  deleteImage,
  setPrimaryImage,
};
