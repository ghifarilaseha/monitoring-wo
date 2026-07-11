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
    const exifr = (await import('exifr')).default;
    const exif = await exifr.parse(file, ['DateTimeOriginal']);

    if (!exif?.DateTimeOriginal) return null;

    const dt = exif.DateTimeOriginal;

    if (dt instanceof Date && !isNaN(dt)) {
      // exifr returns DateTimeOriginal as a JS Date interpreted in LOCAL time.
      // Since the app is always used in WIB (UTC+7), the Date object already
      // represents the correct local time — we just need to store it as UTC.
      // We do NOT subtract 7 hours here; instead we treat the local time
      // as WIB and convert to UTC by appending +07:00 manually.
      const pad = (n) => String(n).padStart(2, '0');
      const y = dt.getFullYear();
      const mo = pad(dt.getMonth() + 1);
      const d = pad(dt.getDate());
      const h = pad(dt.getHours());
      const mi = pad(dt.getMinutes());
      const s = pad(dt.getSeconds());
      // Treat as WIB → convert to UTC ISO string
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+07:00`).toISOString();
    }

    return null;
  } catch {
    return null;
  }
}
