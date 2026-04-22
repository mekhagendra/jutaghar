// Jest mock for otplib
const authenticator = {
  generateSecret: () => 'JBSWY3DPEHPK3PXP',
  keyuri: (email, app, secret) => `otpauth://totp/${app}:${email}?secret=${secret}&issuer=${app}`,
  check: () => true,
};

module.exports = { authenticator };
