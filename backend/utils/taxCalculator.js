import TaxSettings from '../models/TaxSettings.js';

/**
 * Calculate tax for a set of already-resolved order items.
 *
 * @param {Array<{ price: number, quantity: number, vendor: string|ObjectId }>} items
 * @returns {{ tax: number, taxDisplay: number, breakdown: Array }}
 *   - tax        : amount to ADD to the order total (exclusive taxes only)
 *   - taxDisplay : amount to SHOW on invoice (all vendor tax components)
 *   - breakdown  : per-vendor detail array
 */
export const calculateTaxForItems = async (items) => {
  // Group items by vendor
  const vendorMap = new Map();
  for (const item of items) {
    const vendorId = String(item.vendor);
    if (!vendorMap.has(vendorId)) vendorMap.set(vendorId, []);
    vendorMap.get(vendorId).push(item);
  }

  let tax = 0;        // added to order total
  let taxDisplay = 0; // shown on invoice
  const breakdown = [];

  for (const [vendorId, vendorItems] of vendorMap) {
    const settings = await TaxSettings.findOne({ vendor: vendorId }).lean();

    if (!settings || !settings.enabled) {
      breakdown.push({ vendorId, label: 'Tax', rate: 0, amount: 0, inclusive: false });
      continue;
    }

    const vendorSubtotal = vendorItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // Determine applicable rate using same logic as calculateTax instance method
    let rate = settings.defaultRate;
    if (settings.rules && settings.rules.length > 0) {
      const general = settings.rules.find((r) => r.applyToAll);
      if (general) rate = general.rate;
    }

    let taxAmount;
    if (settings.inclusive) {
      // Extract tax component from price — does NOT change the total
      taxAmount = vendorSubtotal - vendorSubtotal / (1 + rate / 100);
    } else {
      // Add tax on top — increases order total
      taxAmount = (vendorSubtotal * rate) / 100;
      tax += taxAmount;
    }

    taxAmount = Math.round(taxAmount * 100) / 100;
    taxDisplay += taxAmount;

    breakdown.push({
      vendorId,
      label: settings.taxLabel || 'Tax',
      rate,
      amount: taxAmount,
      inclusive: settings.inclusive,
    });
  }

  return {
    tax: Math.round(tax * 100) / 100,
    taxDisplay: Math.round(taxDisplay * 100) / 100,
    breakdown,
  };
};
