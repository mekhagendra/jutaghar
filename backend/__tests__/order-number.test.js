import { generateOrderNumber } from '../utils/orderNumber.js';

describe('generateOrderNumber', () => {
  it('uses expected format JGyyyymmddXXXXXX with hex suffix', () => {
    const fixedDate = new Date('2026-04-22T12:00:00.000Z');
    const orderNumber = generateOrderNumber(fixedDate);

    expect(orderNumber).toMatch(/^JG20260422[0-9A-F]{6}$/);
  });

  it('does not collide across 10k generated numbers in a day', () => {
    const fixedDate = new Date('2026-04-22T12:00:00.000Z');
    const values = new Set();

    for (let i = 0; i < 10000; i += 1) {
      values.add(generateOrderNumber(fixedDate));
    }

    expect(values.size).toBe(10000);
  });
});
