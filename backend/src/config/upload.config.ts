/**
 * Upload Configuration
 * 
 * Centralized configuration untuk file uploads
 */

export const uploadConfig = {
  // File size limits (in bytes)
  // Images accept up to 10MB raw — backend auto-compresses to WebP
  maxFileSize: {
    image: parseInt(process.env.MAX_IMAGE_SIZE || '10485760'), // 10MB raw upload (auto-compressed)
    document: parseInt(process.env.MAX_DOCUMENT_SIZE || '5242880'), // 5MB default
    digitalProduct: parseInt(process.env.MAX_DIGITAL_PRODUCT_SIZE || '104857600'), // 100MB default
    chat: parseInt(process.env.MAX_CHAT_FILE_SIZE || '5242880'), // 5MB (auto-compressed for images)
  },

  // Maximum number of files
  maxFiles: {
    multiple: parseInt(process.env.MAX_MULTIPLE_FILES || '10'),
    productImages: parseInt(process.env.MAX_PRODUCT_IMAGES || '10'),
  },

  // Allowed MIME types
  allowedMimeTypes: {
    images: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    archives: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
    ],
    video: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
    ],
  },

  // Allowed file extensions
  allowedExtensions: {
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
    archives: ['zip', 'rar', '7z'],
    audio: ['mp3', 'wav'],
    video: ['mp4', 'mpeg', 'mov'],
  },
};

/**
 * Get max file size for a specific category
 */
export function getMaxFileSize(category: 'image' | 'document' | 'digitalProduct' | 'chat'): number {
  return uploadConfig.maxFileSize[category];
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
