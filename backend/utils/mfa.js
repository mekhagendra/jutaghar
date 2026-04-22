/**
 * MFA utility helpers: AES-256-GCM encryption for TOTP secrets,
 * recovery-code generation and verification.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'jutaghar-mfa-v1';

function getEncryptionKey() {
  const raw = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!raw) throw new Error('MFA_ENCRYPTION_KEY or JWT_SECRET must be set');
  // Derive a stable 32-byte key from whatever length the env var is
  return crypto.scryptSync(raw, SALT, 32);
}

/**
 * Encrypt a plaintext TOTP secret.
 * Returns a colon-delimited string: iv:authTag:ciphertext (all hex).
 */
export function encryptSecret(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a TOTP secret previously encrypted with encryptSecret().
 */
export function decryptSecret(stored) {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/** Generate 8 random recovery codes in XXXXX-XXXXX format. */
export function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const a = crypto.randomBytes(4).toString('hex').toUpperCase();
    const b = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${a}-${b}`;
  });
}

/** Hash recovery codes with bcrypt (cost 10). Returns array of hashes. */
export async function hashRecoveryCodes(codes) {
  return Promise.all(codes.map(c => bcrypt.hash(c, 10)));
}

/**
 * Try to find and consume a matching recovery code.
 * @param {string} code - plain-text code entered by user
 * @param {string[]} hashedCodes - stored bcrypt hashes
 * @returns {number} index of matched code, or -1 if none matched
 */
export async function findRecoveryCodeIndex(code, hashedCodes) {
  for (let i = 0; i < hashedCodes.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(code, hashedCodes[i])) return i;
  }
  return -1;
}
