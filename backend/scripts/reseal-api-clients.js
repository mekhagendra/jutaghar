/**
 * reseal-api-clients.js
 *
 * One-time migration: replaces the old SHA-256 hashes in every ApiClient
 * document with a new bcrypt hash.  Because the original plain-text secrets
 * are unrecoverable, a brand-new random secret is generated for each client.
 *
 * Usage:
 *   node scripts/reseal-api-clients.js
 *
 * The script prints each client's new plain-text secret ONCE.
 * Distribute them to the respective API client owners before the script exits.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

// Import the model *after* dotenv so the module-level env guard in the
// controller (if any) is satisfied — ApiClient itself has no such guard.
import ApiClient from '../models/ApiClient.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to: ${mongoose.connection.name}\n`);

  const clients = await ApiClient.find({});

  if (clients.length === 0) {
    console.log('No API clients found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${clients.length} API client(s). Resealing...\n`);
  console.log('='.repeat(72));
  console.log('IMPORTANT: copy these secrets now — they will not be shown again.');
  console.log('='.repeat(72));

  for (const client of clients) {
    // generateCredentials returns a fresh random secret (plain text)
    const { clientSecret: newPlainSecret } = ApiClient.generateCredentials();

    // Assign the plain secret; the pre('save') bcrypt hook will hash it.
    client.clientSecret = newPlainSecret;
    await client.save();

    console.log(`\nClient: ${client.name} (${client.clientId})`);
    console.log(`  New secret: ${newPlainSecret}`);
  }

  console.log('\n' + '='.repeat(72));
  console.log('Migration complete.');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
