/**
 * File: imageUtils.js
 * Module: utils
 * Purpose: Client-side image compression before uploading to Supabase Storage.
 *          Reduces file size using the browser's Canvas API — no server required.
 *          Keeps UI components clean by isolating all compression logic here.
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

const DEFAULT_MAX_SIZE_MB = 0.8;
const MAX_DIMENSION_PX = 1920;
const QUALITY_PRIMARY = 0.7;
const QUALITY_FALLBACK = 0.5;

/**
 * Compresses an image file on the client using Canvas API.
 * If the file is already within the size limit, it is returned unchanged.
 * Otherwise it is scaled down and re-encoded as JPEG.
 *
 * Strategy:
 * 1. If file <= maxSizeMB, return as-is
 * 2. Scale down if either dimension > MAX_DIMENSION_PX
 * 3. Encode as JPEG at QUALITY_PRIMARY (0.7)
 * 4. If still too large, retry at QUALITY_FALLBACK (0.5)
 *
 * @param {File} file - Original image file from <input type="file">
 * @param {number} maxSizeMB - Target maximum file size in megabytes (default 0.8)
 * @returns {Promise<File>} Compressed image file (always JPEG after compression)
 */
export function compressImage(file, maxSizeMB = DEFAULT_MAX_SIZE_MB) {
  return new Promise((resolve) => {
    const MAX_BYTES = maxSizeMB * 1024 * 1024;

    // If already small enough, skip compression
    if (file.size <= MAX_BYTES) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if dimensions exceed the max
      if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
        if (width > height) {
          height = Math.round(height * MAX_DIMENSION_PX / width);
          width = MAX_DIMENSION_PX;
        } else {
          width = Math.round(width * MAX_DIMENSION_PX / height);
          height = MAX_DIMENSION_PX;
        }
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // Try at primary quality first
      canvas.toBlob((blob) => {
        if (blob && blob.size <= MAX_BYTES) {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        } else {
          // Fall back to lower quality
          canvas.toBlob((blob2) => {
            resolve(new File([blob2 || blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', QUALITY_FALLBACK);
        }
      }, 'image/jpeg', QUALITY_PRIMARY);
    };

    img.src = url;
  });
}
