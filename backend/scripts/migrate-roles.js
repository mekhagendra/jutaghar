/**
 * One-time migration: rename legacy role values in the users collection.
 *   user   -> customer
 *   outlet -> seller
 *
 * Usage:
 *   node scripts/migrate-roles.js
 *
 * The User model also has a runtime normalizer (post('init') / pre('save')) so
 * the app will work with un-migrated documents, but running this script keeps
 * the database tidy and makes role-based queries straightforward.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load backend/.env regardless of where the script is invoked from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = mongoose.connection.collection('users');

  const r1 = await users.updateMany({ role: 'user' }, { $set: { role: 'customer' } });
  const r2 = await users.updateMany({ role: 'outlet' }, { $set: { role: 'seller' } });

  console.log(`user   -> customer : ${r1.modifiedCount} updated`);
  console.log(`outlet -> seller   : ${r2.modifiedCount} updated`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
