// Jest mock for otplib
class OTP {
  constructor() {}

  generateSecret() {
    return 'JBSWY3DPEHPK3PXP';
  }

  generateURI({ issuer, label, secret }) {
    return `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`;
  }

  verifySync() {
    return true;
  }
}

module.exports = { OTP };
