import crypto from 'crypto';
import https from 'https';
import jwt from 'jsonwebtoken';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
// Cache JWKS for 1 hour. Apple rotates keys infrequently.
const KEY_CACHE_TTL_MS = 60 * 60 * 1000;

let keyCache = { fetchedAt: 0, keys: null };

function fetchAppleKeys() {
  return new Promise((resolve, reject) => {
    https
      .get(APPLE_KEYS_URL, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Apple JWKS request failed with status ${res.statusCode}`));
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (!parsed?.keys || !Array.isArray(parsed.keys)) {
              return reject(new Error('Invalid Apple JWKS response'));
            }
            resolve(parsed.keys);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

async function getAppleKeys() {
  const now = Date.now();
  if (keyCache.keys && now - keyCache.fetchedAt < KEY_CACHE_TTL_MS) {
    return keyCache.keys;
  }
  const keys = await fetchAppleKeys();
  keyCache = { fetchedAt: now, keys };
  return keys;
}

function getAllowedAudiences() {
  const raw = process.env.APPLE_CLIENT_IDS || process.env.APPLE_CLIENT_ID || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Verify an Apple identityToken (JWT signed by Apple).
 * Returns the decoded payload on success.
 *
 * Throws an Error with `code` set to one of:
 *  - 'CONFIG_MISSING'   – APPLE_CLIENT_ID(S) env not configured
 *  - 'INVALID_TOKEN'    – token cannot be parsed / no matching key / signature invalid / claims invalid
 *  - 'KEYS_UNAVAILABLE' – upstream JWKS fetch failed
 */
export async function verifyAppleIdentityToken(identityToken) {
  if (!identityToken || typeof identityToken !== 'string') {
    const err = new Error('identityToken is required');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  const audiences = getAllowedAudiences();
  if (audiences.length === 0) {
    const err = new Error('Apple Sign-In is not configured (APPLE_CLIENT_ID missing)');
    err.code = 'CONFIG_MISSING';
    throw err;
  }

  const decodedHeader = jwt.decode(identityToken, { complete: true });
  if (!decodedHeader?.header?.kid) {
    const err = new Error('Invalid Apple identity token (missing kid)');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  let keys;
  try {
    keys = await getAppleKeys();
  } catch (e) {
    const err = new Error('Unable to fetch Apple public keys');
    err.code = 'KEYS_UNAVAILABLE';
    err.cause = e;
    throw err;
  }

  let jwk = keys.find((k) => k.kid === decodedHeader.header.kid);
  if (!jwk) {
    // Force refresh in case Apple just rotated keys.
    keyCache = { fetchedAt: 0, keys: null };
    try {
      keys = await getAppleKeys();
    } catch (e) {
      const err = new Error('Unable to fetch Apple public keys');
      err.code = 'KEYS_UNAVAILABLE';
      err.cause = e;
      throw err;
    }
    jwk = keys.find((k) => k.kid === decodedHeader.header.kid);
  }
  if (!jwk) {
    const err = new Error('No matching Apple signing key for token');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  let publicKeyPem;
  try {
    publicKeyPem = crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({
      type: 'spki',
      format: 'pem',
    });
  } catch (e) {
    const err = new Error('Failed to import Apple public key');
    err.code = 'INVALID_TOKEN';
    err.cause = e;
    throw err;
  }

  try {
    const payload = jwt.verify(identityToken, publicKeyPem, {
      algorithms: [jwk.alg || 'RS256'],
      issuer: APPLE_ISSUER,
      audience: audiences,
    });
    return payload;
  } catch (e) {
    const err = new Error(`Apple token verification failed: ${e.message}`);
    err.code = 'INVALID_TOKEN';
    err.cause = e;
    throw err;
  }
}

export const __testing = {
  resetKeyCache: () => { keyCache = { fetchedAt: 0, keys: null }; },
};
