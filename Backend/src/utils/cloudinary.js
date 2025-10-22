// src/utils/cloudinary.js
const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_URL) {
  // cloudinary.v2 parses CLOUDINARY_URL automatically
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Upload image to Cloudinary with automatic optimization
 * @param {string} filePath - Local file path
 * @param {object} options - Upload options (folder, transformation, etc.)
 * @returns {Promise<object>} - Upload result with secure_url and optimized URLs
 */
async function uploadImage(filePath, options = {}) {
  const uploadOptions = {
    resource_type: 'image',
    quality: 'auto:good', // Smart quality optimization
    fetch_format: 'auto', // Deliver best format based on browser
    flags: 'progressive', // Progressive JPG loading
    ...options
  };

  const result = await cloudinary.uploader.upload(filePath, uploadOptions);
  
  // Generate responsive URLs
  result.responsive_urls = generateResponsiveUrls(result.public_id);
  
  return result;
}

/**
 * Upload file (PDF, docs, etc.) to Cloudinary
 * @param {string} filePath - Local file path
 * @param {object} options - Upload options (folder, etc.)
 * @returns {Promise<object>} - Upload result with secure_url
 */
async function uploadFile(filePath, options = {}) {
  return await cloudinary.uploader.upload(filePath, {
    resource_type: 'auto',
    ...options
  });
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {object} options - Delete options
 * @returns {Promise<object>} - Delete result
 */
async function deleteFile(publicId, options = {}) {
  return await cloudinary.uploader.destroy(publicId, options);
}

/**
 * Generate responsive image URLs for different screen sizes
 * @param {string} publicId - Public ID of the image
 * @returns {object} - Object with URLs for different sizes
 */
function generateResponsiveUrls(publicId) {
  return {
    thumbnail: cloudinary.url(publicId, {
      width: 300,
      height: 300,
      crop: 'fill',
      quality: 'auto:good',
      fetch_format: 'auto'
    }),
    small: cloudinary.url(publicId, {
      width: 640,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto'
    }),
    medium: cloudinary.url(publicId, {
      width: 1024,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto'
    }),
    large: cloudinary.url(publicId, {
      width: 1920,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto'
    }),
    original: cloudinary.url(publicId, {
      quality: 'auto:best',
      fetch_format: 'auto'
    })
  };
}

/**
 * Get optimized image URL with transformations
 * @param {string} url - Cloudinary URL or public ID
 * @param {object} transformations - Transformation options
 * @returns {string} - Optimized URL
 */
function getOptimizedUrl(url, transformations = {}) {
  const defaultTransformations = {
    quality: 'auto:good',
    fetch_format: 'auto',
    flags: 'progressive'
  };

  return cloudinary.url(url, {
    ...defaultTransformations,
    ...transformations
  });
}

/**
 * Check storage usage for a specific folder (club)
 * @param {string} folder - Folder path (e.g., 'clubs/clubId')
 * @returns {Promise<object>} - Storage stats
 */
async function getStorageStats(folder) {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 500
    });

    const totalBytes = result.resources.reduce((sum, resource) => sum + resource.bytes, 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

    return {
      totalFiles: result.resources.length,
      totalBytes,
      totalMB,
      resources: result.resources
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    throw error;
  }
}

/**
 * Find duplicate images using phash (perceptual hash)
 * @param {string} folder - Folder path to check
 * @returns {Promise<Array>} - Array of duplicate groups
 */
async function findDuplicates(folder) {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 500,
      phash: true // Include perceptual hash
    });

    const hashMap = {};
    
    result.resources.forEach(resource => {
      if (resource.phash) {
        if (!hashMap[resource.phash]) {
          hashMap[resource.phash] = [];
        }
        hashMap[resource.phash].push(resource);
      }
    });

    // Filter to only groups with duplicates
    const duplicates = Object.values(hashMap).filter(group => group.length > 1);

    return duplicates;
  } catch (error) {
    console.error('Error finding duplicates:', error);
    throw error;
  }
}

/**
 * Delete multiple files (cleanup)
 * @param {Array<string>} publicIds - Array of public IDs to delete
 * @returns {Promise<object>} - Delete results
 */
async function bulkDelete(publicIds) {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('Error bulk deleting:', error);
    throw error;
  }
}

/**
 * Generate signed upload URL for direct browser upload
 * @param {string} folder - Target folder
 * @param {object} options - Upload options
 * @returns {object} - Signed upload parameters
 */
function generateUploadSignature(folder, options = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'kmit_clubs';

  const params = {
    timestamp,
    folder,
    upload_preset: uploadPreset,
    ...options
  };

  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  return {
    ...params,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
  };
}

module.exports = {
  ...cloudinary,
  uploadImage,
  uploadFile,
  deleteFile,
  generateResponsiveUrls,
  getOptimizedUrl,
  getStorageStats,
  findDuplicates,
  bulkDelete,
  generateUploadSignature
};
