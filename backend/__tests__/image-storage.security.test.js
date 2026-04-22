process.env.CLOUDINARY_CLOUD_NAME = 'demo';
process.env.CLOUDINARY_API_KEY = 'key';
process.env.CLOUDINARY_API_SECRET = 'secret';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({ secure_url: 'https://cdn.example/image.jpg' }),
      upload_stream: jest.fn(),
    },
  },
}));

import { v2 as cloudinary } from 'cloudinary';
import { saveBase64Image } from '../utils/imageStorage.js';

const uploadMock = cloudinary.uploader.upload;

describe('saveBase64Image security validation', () => {
  beforeEach(() => {
    uploadMock.mockClear();
  });

  it('rejects svg payload data URI', async () => {
    const svgPayload = 'data:image/svg+xml;base64,PHN2Zy8+';

    await expect(saveBase64Image(svgPayload, 'products')).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects payload larger than 3MB before cloudinary upload', async () => {
    const buffer = Buffer.alloc(4 * 1024 * 1024, 0x61);
    const payload = `data:image/png;base64,${buffer.toString('base64')}`;

    await expect(saveBase64Image(payload, 'products')).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('passes allowed formats and resource_type to cloudinary', async () => {
    const payload = `data:image/png;base64,${Buffer.from('ok').toString('base64')}`;
    const result = await saveBase64Image(payload, 'products');

    expect(result).toBe('https://cdn.example/image.jpg');
    expect(uploadMock).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({
        resource_type: 'image',
        allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
      })
    );
  });
});
