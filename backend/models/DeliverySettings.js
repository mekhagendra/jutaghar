import mongoose from 'mongoose';

const deliverySettingsSchema = new mongoose.Schema(
  {
    // There is always exactly one document; this field acts as a singleton key
    singleton: { type: String, default: 'default', unique: true },

    // Minimum delivery fee charged regardless of order value (in NPR)
    minDeliveryFee: { type: Number, default: 50, min: 0 },

    // Delivery fee as a percentage of the order subtotal (e.g. 5 means 5%)
    deliveryFeeRate: { type: Number, default: 5, min: 0 },

    // Orders at or above this subtotal get free delivery (0 = disabled)
    freeDeliveryThreshold: { type: Number, default: 5000, min: 0 },
  },
  { timestamps: true }
);

/**
 * Calculate the shipping cost for a given subtotal using the stored settings.
 * Logic:
 *   fee = Math.max(minDeliveryFee, subtotal * deliveryFeeRate / 100)
 *   if subtotal >= freeDeliveryThreshold (and threshold > 0) => fee = 0
 */
deliverySettingsSchema.statics.calculateShipping = async function (subtotal) {
  const settings = await this.getSettings();
  if (
    settings.freeDeliveryThreshold > 0 &&
    subtotal >= settings.freeDeliveryThreshold
  ) {
    return 0;
  }
  const calculated = subtotal * (settings.deliveryFeeRate / 100);
  return Math.max(settings.minDeliveryFee, calculated);
};

deliverySettingsSchema.statics.getSettings = async function () {
  let doc = await this.findOne({ singleton: 'default' });
  if (!doc) {
    try {
      doc = await this.create({ singleton: 'default' });
    } catch (error) {
      // Another request may have created the singleton concurrently.
      if (error?.code === 11000) {
        doc = await this.findOne({ singleton: 'default' });
      } else {
        throw error;
      }
    }
  }
  return doc;
};

const DeliverySettings = mongoose.model('DeliverySettings', deliverySettingsSchema);
export default DeliverySettings;
