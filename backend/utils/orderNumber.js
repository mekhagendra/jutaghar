import { customAlphabet } from 'nanoid';

const generateSuffix = customAlphabet('0123456789ABCDEF', 6);
const issuedByDate = new Map();

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getIssuedSet(dateKey) {
  if (!issuedByDate.has(dateKey)) {
    issuedByDate.set(dateKey, new Set());
    if (issuedByDate.size > 8) {
      const oldestKey = issuedByDate.keys().next().value;
      issuedByDate.delete(oldestKey);
    }
  }
  return issuedByDate.get(dateKey);
}

export function generateOrderNumber(date = new Date()) {
  const dateKey = formatDate(date);
  const issued = getIssuedSet(dateKey);

  for (let attempts = 0; attempts < 8; attempts += 1) {
    const suffix = generateSuffix();
    if (!issued.has(suffix)) {
      issued.add(suffix);
      return `JG${dateKey}${suffix}`;
    }
  }

  throw new Error('Unable to generate unique order number');
}
