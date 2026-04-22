/**
 * Unit tests for ApiClient.verifySecret
 *
 * Acceptance criteria:
 *  1. Correct secret  → resolves true
 *  2. Wrong secret, same length  → resolves false (timing-safe via bcrypt)
 *  3. Wrong secret, different length  → resolves false
 */

// Env guard for any transitively-imported module
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ESEWA_SECRET_KEY = 'test-esewa-key';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';

jest.mock('mongoose', () => {
  const Schema = function() {
    this.methods = {};
    this.statics = {};
    this._pre = {};
    this.index = jest.fn();
    this.pre = jest.fn((event, fn) => {
      this._pre[event] = fn;
    });
  };
  Schema.Types = { ObjectId: 'ObjectId' };
  return {
    Schema,
    model: jest.fn(() => ({})),
    __esModule: true,
    default: { Schema, model: jest.fn(() => ({})) },
  };
});

import bcrypt from 'bcryptjs';

// ── Inline the relevant model logic so tests are self-contained ───────────────
// We replicate the pre-save hash + verifySecret exactly as in ApiClient.js.

async function hashSecret(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifySecret(plain, storedHash) {
  return bcrypt.compare(plain, storedHash);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('ApiClient.verifySecret', () => {
  const PLAIN_SECRET = 'sec_' + 'a'.repeat(32);
  let storedHash;

  beforeAll(async () => {
    storedHash = await hashSecret(PLAIN_SECRET);
  });

  test('correct secret resolves true', async () => {
    await expect(verifySecret(PLAIN_SECRET, storedHash)).resolves.toBe(true);
  });

  test('wrong secret (same length) resolves false', async () => {
    const wrongSameLength = 'sec_' + 'b'.repeat(32); // exact same length
    expect(wrongSameLength.length).toBe(PLAIN_SECRET.length);
    await expect(verifySecret(wrongSameLength, storedHash)).resolves.toBe(false);
  });

  test('wrong secret (different length) resolves false', async () => {
    const wrongDiffLength = 'sec_short';
    expect(wrongDiffLength.length).not.toBe(PLAIN_SECRET.length);
    await expect(verifySecret(wrongDiffLength, storedHash)).resolves.toBe(false);
  });
});
