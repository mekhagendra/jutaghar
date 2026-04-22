import mongoose from 'mongoose';

export const asString = (v) => String(v).slice(0, 256);

export const asNumber = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const asObjectId = (v) => {
  const value = String(v || '').trim();
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const err = new Error('Invalid ObjectId');
    err.statusCode = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(value);
};

export const stripOperators = (input) => {
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i += 1) {
      input[i] = stripOperators(input[i]);
    }
    return input;
  }

  if (input && typeof input === 'object') {
    for (const key of Object.keys(input)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete input[key];
      } else {
        input[key] = stripOperators(input[key]);
      }
    }
  }

  return input;
};
