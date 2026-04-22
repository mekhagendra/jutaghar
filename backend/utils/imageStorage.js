import { v2 as cloudinary } from 'cloudinary';

let isConfigured = false;

function parseCloudinaryUrl(cloudinaryUrl) {
  try {
    const parsed = new URL(cloudinaryUrl);

    if (parsed.protocol !== 'cloudinary:') {
      return null;
    }

    return {
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password)
    };
  } catch {
    return null;
  }
}

function ensureCloudinaryConfigured() {
  if (isConfigured) {
    return;
  }

  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (CLOUDINARY_URL) {
    const configFromUrl = parseCloudinaryUrl(CLOUDINARY_URL);

    if (!configFromUrl?.cloud_name || !configFromUrl?.api_key || !configFromUrl?.api_secret) {
      throw new Error('Invalid CLOUDINARY_URL. Expected format: cloudinary://<api_key>:<api_secret>@<cloud_name>');
    }

    cloudinary.config({
      ...configFromUrl,
      secure: true
    });
    isConfigured = true;
    return;
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
  isConfigured = true;
}

function getFolder(subDir) {
  const baseFolder = process.env.CLOUDINARY_FOLDER || 'jutaghar';
  return `${baseFolder}/${subDir}`;
}

export async function saveBase64Image(imageData, subDir = 'products') {
  if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    return imageData;
  }

  ensureCloudinaryConfigured();

  const result = await cloudinary.uploader.upload(imageData, {
    folder: getFolder(subDir),
    resource_type: 'image'
  });

  return result.secure_url;
}

export async function uploadImageBuffer(buffer, subDir = 'products') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Image buffer is required');
  }

  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: getFolder(subDir),
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

export async function processProductImages(data) {
  if (data.mainImage) {
    data.mainImage = await saveBase64Image(data.mainImage, 'products');
  }
  if (data.images && Array.isArray(data.images)) {
    data.images = await Promise.all(data.images.map((image) => saveBase64Image(image, 'products')));
  }
  if (data.variants && Array.isArray(data.variants)) {
    data.variants = await Promise.all(data.variants.map(async (variant) => {
      if (variant.image) {
        return {
          ...variant,
          image: await saveBase64Image(variant.image, 'products')
        };
      }
      return variant;
    }));
  }
  return data;
}
