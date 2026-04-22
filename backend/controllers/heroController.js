import HeroSlide from '../models/HeroSlide.js';

// Public: Get all active hero slides
export const getHeroSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.find({ isActive: true }).sort('order -createdAt');
    res.json({ success: true, data: slides });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Admin: Get all hero slides (including inactive)
export const getAllHeroSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort('order -createdAt');
    res.json({ success: true, data: slides });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Admin: Create a new hero slide
export const createHeroSlide = async (req, res) => {
  try {
    const { collectionName, title, shopNowUrl, image, order, isActive } = req.body;

    if (!collectionName || !title || !shopNowUrl || !image) {
      return res.status(400).json({
        success: false,
        message: 'collectionName, title, shopNowUrl, and image are required',
      });
    }

    const slide = await HeroSlide.create({
      collectionName,
      title,
      shopNowUrl,
      image,
      order: order ?? 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Admin: Update a hero slide
export const updateHeroSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const { collectionName, title, shopNowUrl, image, order, isActive } = req.body;

    const updateData = { collectionName, title, shopNowUrl, order, isActive };
    if (image) {
      updateData.image = image;
    }

    const slide = await HeroSlide.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!slide) {
      return res.status(404).json({ success: false, message: 'Hero slide not found' });
    }

    res.json({ success: true, data: slide });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Admin: Delete a hero slide
export const deleteHeroSlide = async (req, res) => {
  try {
    const { id } = req.params;

    const slide = await HeroSlide.findByIdAndDelete(id);

    if (!slide) {
      return res.status(404).json({ success: false, message: 'Hero slide not found' });
    }

    res.json({ success: true, message: 'Hero slide deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};
