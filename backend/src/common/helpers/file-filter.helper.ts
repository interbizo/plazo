import { BadRequestException, Logger } from '@nestjs/common';

const logger = new Logger('FileFilter');

/**
 * File filter untuk image uploads
 * Menerima: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC
 * Backend melakukan validasi lebih ketat via magic bytes setelah upload.
 */
export const imageFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  logger.log(`[ImageFilter] Checking file: ${file?.originalname}, MIME: ${file?.mimetype}`);
  
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/avif',
    // Some browsers/devices send generic type
    'application/octet-stream',
  ];

  if (!file) {
    logger.error('[ImageFilter] No file provided');
    return callback(new BadRequestException('No file provided'), false);
  }

  // Check MIME type first
  if (allowedMimes.includes(file.mimetype)) {
    logger.log(`[ImageFilter] File accepted by MIME: ${file.originalname}`);
    callback(null, true);
    return;
  }

  // Fallback: check extension (some devices send wrong MIME type)
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif'];

  if (ext && validExtensions.includes(ext)) {
    logger.warn(`[ImageFilter] MIME mismatch but extension valid: ${file.originalname} (MIME: ${file.mimetype}, ext: ${ext})`);
    callback(null, true);
    return;
  }

  logger.error(`[ImageFilter] Rejected: ${file.originalname} (MIME: ${file.mimetype}, ext: ${ext})`);
  return callback(
    new BadRequestException(
      'Format file tidak didukung. Gunakan format JPEG, PNG, GIF, atau WebP.',
    ),
    false,
  );
};

/**
 * File filter untuk document uploads
 * Hanya menerima: PDF, DOC, DOCX, XLS, XLSX
 */
export const documentFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!file) {
    return callback(new BadRequestException('No file provided'), false);
  }

  if (!allowedMimes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Invalid file type. Only PDF, DOC, DOCX, XLS, and XLSX files are allowed.',
      ),
      false,
    );
  }

  callback(null, true);
};

/**
 * File filter untuk general attachments (images + documents)
 * Permissive di level multer — backend validates via magic bytes.
 */
export const attachmentFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/avif',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Some browsers/devices send generic type for images
    'application/octet-stream',
  ];

  if (!file) {
    return callback(new BadRequestException('No file provided'), false);
  }

  // Check MIME type
  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  // Fallback: check extension
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  const validExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif',
    'pdf', 'doc', 'docx', 'xls', 'xlsx',
  ];

  if (ext && validExtensions.includes(ext)) {
    callback(null, true);
    return;
  }

  return callback(
    new BadRequestException(
      'Format file tidak didukung. Gunakan gambar (JPEG, PNG, GIF, WebP) atau dokumen (PDF, DOC, DOCX).',
    ),
    false,
  );
};

/**
 * File filter untuk digital product files
 * Menerima berbagai format file digital
 */
export const digitalProductFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = [
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    // Audio
    'audio/mpeg',
    'audio/wav',
    // Video
    'video/mp4',
    'video/mpeg',
  ];

  if (!file) {
    return callback(new BadRequestException('No file provided'), false);
  }

  if (!allowedMimes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Invalid file type for digital product.',
      ),
      false,
    );
  }

  callback(null, true);
};
