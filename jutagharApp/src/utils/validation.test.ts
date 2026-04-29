import { isValidEmail, normalizeEmail } from '@/utils/validation';

describe('validation utils', () => {
  it('normalizes email by trimming and lowercasing', () => {
    expect(normalizeEmail('  Test.User@Example.COM  ')).toBe('test.user@example.com');
  });

  it('accepts valid email formats', () => {
    expect(isValidEmail('person@example.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.domain.co')).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(isValidEmail('plainaddress')).toBe(false);
    expect(isValidEmail('missing-domain@')).toBe(false);
    expect(isValidEmail('@missing-local.com')).toBe(false);
  });
});
