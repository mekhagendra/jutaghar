import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Get the upload directory from environment.
 * Called at runtime (after dotenv.config()) so it always reads the correct value.
 */
function getUploadDir() {
  return process.env.UPLOAD_DIR || './uploads';
}

/**
 * Save a base64 data-URL image to the upload directory.
 * Returns the public URL path (e.g. /uploads/products/uuid.jpg).
 * If the input is not a base64 data-URL, returns it unchanged.
 */
export function saveBase64Image(base64Data, subDir = 'products') {
  if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:image/')) {
    return base64Data; // already a file path or URL
  }

  const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return base64Data;

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const uploadDir = getUploadDir();
  const dir = path.join(uploadDir, subDir);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path.join(dir, fileName), buffer);
  return `/uploads/${subDir}/${fileName}`;
}

/**
 * Process product data — converts any base64 images
 * (mainImage, images[], variants[].image) to file paths.
 */
export function processProductImages(data) {
  if (data.mainImage) {
    data.mainImage = saveBase64Image(data.mainImage, 'products');
  }
  if (data.images && Array.isArray(data.images)) {
    data.images = data.images.map(img => saveBase64Image(img, 'products'));
  }
  if (data.variants && Array.isArray(data.variants)) {
    data.variants = data.variants.map(v => {
      if (v.image) {
        v.image = saveBase64Image(v.image, 'products');
      }
      return v;
    });
  }
  return data;
}
