// Jest mock for qrcode
const qrcode = {
  toDataURL: async () => 'data:image/png;base64,mock',
};

module.exports = qrcode;
