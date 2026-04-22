/**
 * Jest setupFiles — runs before any test module is loaded.
 * Sets the minimum env vars required by module-level guards
 * (e.g. paymentController throws at import time when these are absent).
 *
 * Individual test files can override these values after import.
 */
process.env.JWT_SECRET          = process.env.JWT_SECRET          || 'test-jwt-secret';
process.env.ESEWA_SECRET_KEY    = process.env.ESEWA_SECRET_KEY    || '8gBm/:&EnhH.1/q';
process.env.ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
process.env.KHALTI_SECRET_KEY   = process.env.KHALTI_SECRET_KEY   || 'test-khalti-key';
process.env.KHALTI_GATEWAY_URL  = process.env.KHALTI_GATEWAY_URL  || 'https://dev.khalti.com/api/v2';
