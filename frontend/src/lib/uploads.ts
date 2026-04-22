import api from '@/lib/api';

const DATA_URL_PREFIX = 'data:image/';

export const isImageDataUrl = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(DATA_URL_PREFIX);
};

const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
};

export const uploadProductDataUrls = async (dataUrls: string[]): Promise<string[]> => {
  if (!dataUrls.length) return [];

  const formData = new FormData();
  for (let i = 0; i < dataUrls.length; i += 1) {
    const file = await dataUrlToFile(dataUrls[i], `product-${Date.now()}-${i}.jpg`);
    formData.append('images', file);
  }

  const response = await api.post('/api/uploads/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data?.data?.urls || [];
};

export const uploadHeroDataUrl = async (dataUrl: string): Promise<string> => {
  const formData = new FormData();
  const file = await dataUrlToFile(dataUrl, `hero-${Date.now()}.jpg`);
  formData.append('image', file);

  const response = await api.post('/api/uploads/hero', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data?.data?.url || '';
};
