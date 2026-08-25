/**
 * High-performance client-side image compression & preloading utility.
 * Optimizes photos to standard document dimensions (~100KB-180KB instead of 5MB-10MB),
 * drastically speeding up uploads, storage, and eliminating print preview stalls.
 */

/**
 * Compresses an image File or Blob using HTML5 Canvas.
 * @param {File|Blob} file - Original raw image from file picker or camera.
 * @param {Object} options - { maxWidth, maxHeight, quality, mimeType }
 * @returns {Promise<File>} Compressed File
 */
export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1600,
    quality = 0.85,
    mimeType = 'image/jpeg'
  } = options;

  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // If already a lightweight WebP/JPEG under 150KB, return as-is
  if (file.size && file.size < 150 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Calculate aspect-ratio preserved dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw with smooth bi-linear interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const fileName = (file.name || 'photo.jpg').replace(/\.[^/.]+$/, '') + '.jpg';
          const compressedFile = new File([blob], fileName, {
            type: mimeType,
            lastModified: Date.now()
          });

          resolve(compressedFile);
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback to raw file on error
    };

    img.src = objectUrl;
  });
}

/**
 * Pre-decodes an array of image URLs into GPU/browser memory.
 * Ensures window.print() can immediately render previews without waiting for network or raster decodes.
 * @param {Array<string>} urls - List of image URLs
 * @param {number} timeoutMs - Maximum wait time before proceeding (default 1500ms)
 * @returns {Promise<void>}
 */
export async function preloadAndDecodeImages(urls, timeoutMs = 1500) {
  if (!urls || urls.length === 0) return;

  const validUrls = urls.filter((u) => u && typeof u === 'string' && u.trim() !== '');
  if (validUrls.length === 0) return;

  const decodePromises = validUrls.map((url) => {
    return new Promise((resolve) => {
      const img = new Image();

      const done = () => {
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
        } else {
          resolve();
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        done();
      } else {
        img.onload = done;
        img.onerror = resolve;
        img.src = url;
      }
    });
  });

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));

  // Race decoding against timeout to never block user action
  await Promise.race([Promise.allSettled(decodePromises), timeoutPromise]);
}
