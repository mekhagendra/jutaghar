import mongoose from 'mongoose';

const taxRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "VAT", "GST", "Service Tax"
    rate: { type: Number, required: true, min: 0, max: 100 }, // percentage
    applyToAll: { type: Boolean, default: true }, // if false, only applies to listed categories
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  },
  { _id: true }
);

const taxSettingsSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one settings document per vendor
    },
    enabled: { type: Boolean, default: false },
    taxLabel: { type: String, default: 'VAT', trim: true, maxlength: 30 },
    defaultRate: { type: Number, default: 13, min: 0, max: 100 }, // Nepal VAT default
    inclusive: {
      type: Boolean,
      default: false, // false = tax added on top; true = tax included in price
    },
    rules: [taxRuleSchema],
  },
  { timestamps: true }
);

/**
 * Calculate tax amount for a given price using these settings.
 * @param {number} price
 * @param {string|null} categoryId  — used to match specific tax rules
 * @returns {{ taxAmount: number, rate: number, label: string }}
 */
taxSettingsSchema.methods.calculateTax = function (price, categoryId = null) {
  if (!this.enabled) return { taxAmount: 0, rate: 0, label: this.taxLabel };

  // Find the most specific rule for the category
  let rate = this.defaultRate;
  if (categoryId && this.rules.length > 0) {
    const specific = this.rules.find(
      (r) => !r.applyToAll && r.categories.map(String).includes(String(categoryId))
    );
    const general = this.rules.find((r) => r.applyToAll);
    if (specific) rate = specific.rate;
    else if (general) rate = general.rate;
  } else if (this.rules.length > 0) {
    const general = this.rules.find((r) => r.applyToAll);
    if (general) rate = general.rate;
  }

  const taxAmount = this.inclusive
    ? price - price / (1 + rate / 100) // extract tax from inclusive price
    : (price * rate) / 100; // add tax on top

  return { taxAmount: Math.round(taxAmount * 100) / 100, rate, label: this.taxLabel };
};

const TaxSettings = mongoose.model('TaxSettings', taxSettingsSchema);
export default TaxSettings;
