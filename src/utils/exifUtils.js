/**
 * File: exifUtils.js
 * Module: utils
 * Purpose: Reads EXIF metadata from image files before upload.
 *          Extracts DateTimeOriginal for photo time tracking.
 *          Gracefully handles files without EXIF data (returns null).
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

/**
 * Reads the DateTimeOriginal EXIF tag from an image file.
 * Returns the timestamp as a UTC ISO string, or null if unavailable.
 *
 * Important: EXIF DateTimeOriginal has no timezone info.
 * We assume the photo was taken in WIB (Asia/Jakarta, UTC+7)
 * since the app is used exclusively in Indonesia.
 *
 * @param {File} file - Image file from <input type="file">
 * @returns {Promise<string|null>} UTC ISO string or null
 */
export async function readExifTakenAt(file) {
  try {
    // Dynamic import so exifr is not bundled server-side
    const exifr = (await import('exifr')).default;
    const exif = await exifr.parse(file, ['DateTimeOriginal']);

    if (!exif?.DateTimeOriginal) return null;

    const dt = exif.DateTimeOriginal;

    // DateTimeOriginal is a JS Date object from exifr
    // but it has no timezone — treat as WIB (UTC+7)
    if (dt instanceof Date && !isNaN(dt)) {
      // Subtract 7 hours to convert assumed WIB → UTC for storage
      const utc = new Date(dt.getTime() - 7 * 60 * 60 * 1000);
      return utc.toISOString();
    }

    return null;
  } catch {
    // EXIF not available, file format not supported, or library error
    return null;
  }
}
