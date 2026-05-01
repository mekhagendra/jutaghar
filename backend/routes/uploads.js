import express from 'express';
import multer from 'multer';
import { authenticate, requireAdmin, requireVendor } from '../middleware/auth.js';
import { uploadImageBuffer } from '../utils/imageStorage.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

const handleUploadError = (error, res) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Each image must be 5MB or smaller',
      });
    }
    return res.status(400).json({ success: false, message: error.message });
  }

  return res.status(400).json({ success: false, message: error.message });
};

router.post('/products', authenticate, requireVendor, (req, res) => {
  upload.array('images', 10)(req, res, async (error) => {
    if (error) {
      return handleUploadError(error, res);
    }

    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ success: false, message: 'At least one image is required' });
      }

      const urls = await Promise.all(files.map((file) => uploadImageBuffer(file.buffer, 'products')));
      return res.status(201).json({ success: true, data: { urls } });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
});

router.post('/hero', authenticate, requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      return handleUploadError(error, res);
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image file is required' });
      }

      const url = await uploadImageBuffer(req.file.buffer, 'hero');
      return res.status(201).json({ success: true, data: { url } });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
});

router.post('/seller-image', authenticate, (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      return handleUploadError(error, res);
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Image file is required' });
      }

      const url = await uploadImageBuffer(req.file.buffer, 'sellers');
      return res.status(201).json({ success: true, data: { url } });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
});

router.post('/returns', authenticate, (req, res) => {
  upload.array('images', 5)(req, res, async (error) => {
    if (error) {
      return handleUploadError(error, res);
    }

    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ success: false, message: 'At least one image is required' });
      }

      const urls = await Promise.all(files.map((file) => uploadImageBuffer(file.buffer, 'returns')));
      return res.status(201).json({ success: true, data: { urls } });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });
});

export default router;
