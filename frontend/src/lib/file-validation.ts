/**
 * File upload configuration
 * 
 * Images: Accept up to 10MB — backend auto-compresses to optimized WebP.
 * Documents: Accept up to 5MB.
 * 
 * Users don't need to manually resize or compress images.
 * The server handles all optimization automatically.
 */

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images (auto-compressed by backend)
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB for documents

// Legacy export for backward compatibility
export const MAX_FILE_SIZE = MAX_IMAGE_SIZE;
export const MAX_FILE_SIZE_MB = 10;

export const FILE_SIZE_ERROR_MESSAGE = "Ukuran gambar maksimal 10MB. Server akan otomatis mengoptimalkan ukuran file.";
export const DOCUMENT_SIZE_ERROR_MESSAGE = "Ukuran dokumen maksimal 5MB.";

/**
 * Validate image file size (max 10MB, auto-compressed by backend)
 */
export function validateFileSize(file: File): boolean {
  if (file.type.startsWith("image/")) {
    return file.size <= MAX_IMAGE_SIZE;
  }
  return file.size <= MAX_DOCUMENT_SIZE;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Validate image file
 * @param file File to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "File harus berupa gambar (JPG, PNG, GIF, WebP)";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Ukuran gambar maksimal 10MB. File Anda: ${formatFileSize(file.size)}`;
  }
  return null;
}

/**
 * Validate document file (PDF, DOC, etc)
 */
export function validateDocumentFile(file: File): string | null {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return "File harus berupa PDF atau DOC";
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return `Ukuran dokumen maksimal 5MB. File Anda: ${formatFileSize(file.size)}`;
  }
  return null;
}
