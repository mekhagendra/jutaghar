import DeliverySettings from '../models/DeliverySettings.js';

// GET /api/delivery-settings  — public
export const getDeliverySettings = async (_req, res) => {
  try {
    const settings = await DeliverySettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/delivery-settings  — admin only
export const updateDeliverySettings = async (req, res) => {
  try {
    const { minDeliveryFee, deliveryFeeRate, freeDeliveryThreshold } = req.body;

    const update = {};
    if (minDeliveryFee !== undefined) update.minDeliveryFee = Number(minDeliveryFee);
    if (deliveryFeeRate !== undefined) update.deliveryFeeRate = Number(deliveryFeeRate);
    if (freeDeliveryThreshold !== undefined)
      update.freeDeliveryThreshold = Number(freeDeliveryThreshold);

    const settings = await DeliverySettings.findOneAndUpdate(
      { singleton: 'default' },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
