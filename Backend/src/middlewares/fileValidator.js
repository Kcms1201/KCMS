/**
 * File Upload Validation Middleware
 * Validates file types, sizes, and content before upload
 * Includes image compression for files >2MB (Workplan Line 406)
 */

const { processUploadedImage, isSharpAvailable } = require('../utils/imageProcessor');

const allowedTypes = {
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxSize: 25 * 1024 * 1024 // 25MB
  },
  document: {
    mimes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['pdf', 'docx'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  video: {
    mimes: ['video/mp4'],
    extensions: ['mp4'],
    maxSize: 50 * 1024 * 1024 // 50MB
  }
};

/**
 * Validate file based on category
 */
function validateFile(file, category = 'image') {
  if (!file) {
    throw new Error('No file provided');
  }

  const allowed = allowedTypes[category];
  if (!allowed) {
    throw new Error(`Invalid category: ${category}`);
  }

  // Check MIME type
  if (!allowed.mimes.includes(file.mimetype)) {
    throw new Error(
      `Invalid file type. Allowed: ${allowed.extensions.join(', ')}`
    );
  }

  // Check file size
  if (file.size > allowed.maxSize) {
    const maxMB = allowed.maxSize / 1024 / 1024;
    throw new Error(`File too large. Maximum size: ${maxMB}MB`);
  }

  // Check file extension matches MIME type
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (!allowed.extensions.includes(ext)) {
    throw new Error(
      `File extension '${ext}' does not match content type '${file.mimetype}'`
    );
  }

  // Security: Check for dangerous double extensions
  // Allow dots in filenames (e.g., "my.photo.name.jpg" is OK)
  // But reject files with executable extensions before the final extension
  // (e.g., "malware.php.jpg", "script.js.png")
  const dangerousExtensions = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jse',
    'php', 'php3', 'php4', 'php5', 'phtml', 'asp', 'aspx', 'jsp',
    'sh', 'bash', 'cgi', 'pl', 'py', 'rb', 'jar', 'app'
  ];
  
  const nameParts = file.originalname.split('.');
  // Check all parts except the last one (which is the real extension we already validated)
  for (let i = 0; i < nameParts.length - 1; i++) {
    const part = nameParts[i].toLowerCase();
    if (dangerousExtensions.includes(part)) {
      throw new Error(`Suspicious file extension detected: .${part}`);
    }
  }

  return true;
}

/**
 * Express middleware for file validation and image processing
 * Workplan Line 406: Compress images if >2MB
 * Workplan Line 407: Generate thumbnail
 */
function validateUpload(category = 'image', options = {}) {
  return async (req, res, next) => {
    try {
      const processImages = options.processImages !== false && category === 'image';

      // Single file upload
      if (req.file) {
        validateFile(req.file, category);
        
        // Process image: compress if >2MB and generate thumbnail
        if (processImages && isSharpAvailable()) {
          const processingResult = await processUploadedImage(req.file, options);
          req.file.processingInfo = processingResult;
          
          if (processingResult.thumbnail) {
            req.file.thumbnailPath = processingResult.thumbnail;
          }
        }
      }

      // Multiple file uploads
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          validateFile(file, category);
          
          // Process each image
          if (processImages && isSharpAvailable()) {
            const processingResult = await processUploadedImage(file, options);
            file.processingInfo = processingResult;
            
            if (processingResult.thumbnail) {
              file.thumbnailPath = processingResult.thumbnail;
            }
          }
        }
      }

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
}

/**
 * Get file category from MIME type
 */
function getFileCategory(mimetype) {
  for (const [category, config] of Object.entries(allowedTypes)) {
    if (config.mimes.includes(mimetype)) {
      return category;
    }
  }
  return null;
}

module.exports = {
  validateFile,
  validateUpload,
  getFileCategory,
  allowedTypes
};
