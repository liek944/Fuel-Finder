/**
 * Data Transformers
 * Functions to transform database data to API response format
 */

const { getSupabaseImageUrl, isSupabaseStorageAvailable } = require("../services/supabaseStorage");

/**
 * Helper function to generate image URL
 */
function getImageUrl(filename, type = "stations") {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${baseUrl}/api/images/${type}/${filename}`;
}

/**
 * Transform station data for API response
 */
function transformStationData(stations) {
  return stations.map((station) => {
    // Process images if they exist
    let processedImages = [];
    let primaryImage = null;

    if (station.images && Array.isArray(station.images)) {
      processedImages = station.images.map((img) => {
        // Generate URLs for each image
        const localUrl = getImageUrl(img.filename, "stations");
        const supabaseUrl = isSupabaseStorageAvailable()
          ? getSupabaseImageUrl(`stations/${img.filename}`)
          : null;
        const supabaseThumbnailUrl = isSupabaseStorageAvailable()
          ? getSupabaseImageUrl(`thumbnails/thumb_${img.filename}`)
          : null;

        return {
          ...img,
          url: supabaseUrl || localUrl, // Prefer Supabase URL if available
          thumbnailUrl: supabaseThumbnailUrl || supabaseUrl || localUrl,
        };
      });

      // Find primary image
      primaryImage = processedImages.find((img) => img.is_primary) || processedImages[0] || null;
    }

    return {
      id: station.id,
      name: station.name,
      brand: station.brand,
      fuel_price: station.fuel_price || 0,
      fuel_prices: station.fuel_prices || [],
      services: station.services || [],
      address: station.address || "",
      phone: station.phone || null,
      operating_hours: station.operating_hours || null,
      location: {
        lat: parseFloat(station.lat),
        lng: parseFloat(station.lng),
      },
      distance_meters: station.distance_meters || null,
      images: processedImages,
      primaryImage: primaryImage,
    };
  });
}

/**
 * Transform POI data for API response
 */
function transformPoiData(pois) {
  return pois.map((poi) => {
    // Process images if they exist
    let processedImages = [];
    let primaryImage = null;

    if (poi.images && Array.isArray(poi.images)) {
      processedImages = poi.images.map((img) => {
        // Generate URLs for each image
        const localUrl = getImageUrl(img.filename, "pois");
        const supabaseUrl = isSupabaseStorageAvailable()
          ? getSupabaseImageUrl(`pois/${img.filename}`)
          : null;
        const supabaseThumbnailUrl = isSupabaseStorageAvailable()
          ? getSupabaseImageUrl(`thumbnails/thumb_${img.filename}`)
          : null;

        return {
          ...img,
          url: supabaseUrl || localUrl, // Prefer Supabase URL if available
          thumbnailUrl: supabaseThumbnailUrl || supabaseUrl || localUrl,
        };
      });

      // Find primary image
      primaryImage = processedImages.find((img) => img.is_primary) || processedImages[0] || null;
    }

    return {
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: poi.address || null,
      phone: poi.phone || null,
      operating_hours: poi.operating_hours || null,
      location: {
        lat: parseFloat(poi.lat),
        lng: parseFloat(poi.lng),
      },
      distance_meters: poi.distance_meters || null,
      images: processedImages,
      primaryImage: primaryImage,
      created_at: poi.created_at,
      updated_at: poi.updated_at,
    };
  });
}

/**
 * Transform price report data
 */
function transformPriceReportData(reports) {
  return reports.map((report) => ({
    id: report.id,
    station_id: report.station_id,
    station_name: report.station_name || null,
    fuel_type: report.fuel_type,
    price: parseFloat(report.price),
    reporter_name: report.reporter_name,
    reporter_contact: report.reporter_contact,
    photo_url: report.photo_url,
    is_verified: report.is_verified,
    verified_by: report.verified_by,
    verified_at: report.verified_at,
    created_at: report.created_at,
  }));
}

/**
 * Transform donation data
 */
function transformDonationData(donations) {
  return donations.map((donation) => ({
    id: donation.id,
    payment_intent_id: donation.payment_intent_id,
    amount: parseFloat(donation.amount),
    currency: donation.currency,
    status: donation.status,
    donor_name: donation.donor_name,
    donor_email: donation.donor_email,
    cause: donation.cause,
    impact_description: donation.impact_description,
    created_at: donation.created_at,
    updated_at: donation.updated_at,
  }));
}

module.exports = {
  transformStationData,
  transformPoiData,
  transformPriceReportData,
  transformDonationData
};
