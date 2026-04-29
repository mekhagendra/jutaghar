import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const imagePool = [
  'https://placehold.co/1600x900/png?text=JutaGhar+Outlet+Showroom',
  'https://placehold.co/1600x900/png?text=JutaGhar+Sneaker+Gallery',
  'https://placehold.co/1600x900/png?text=JutaGhar+Running+Collection',
  'https://placehold.co/1600x900/png?text=JutaGhar+Streetwear+Shoes',
  'https://placehold.co/1600x900/png?text=JutaGhar+Outlet+Display',
  'https://placehold.co/1600x900/png?text=JutaGhar+Casual+Collection',
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = mongoose.connection.collection('users');

  const sellers = await users.find({ role: 'seller' }).project({ _id: 1, sellerImage: 1 }).toArray();

  let updated = 0;
  for (let i = 0; i < sellers.length; i += 1) {
    const seller = sellers[i];
    if (seller.sellerImage && String(seller.sellerImage).trim()) {
      continue;
    }

    const sellerImage = imagePool[i % imagePool.length];
    const result = await users.updateOne({ _id: seller._id }, { $set: { sellerImage } });
    if (result.modifiedCount > 0) {
      updated += 1;
    }
  }

  console.log(`Sellers scanned: ${sellers.length}`);
  console.log(`Seller images seeded: ${updated}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
