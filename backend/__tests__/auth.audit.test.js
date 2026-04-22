process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ESEWA_SECRET_KEY = 'test-esewa-secret';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASSWORD = 'test-pass';
process.env.GOOGLE_CLIENT_ID = 'test-google-id';

jest.mock('../models/User.js');
jest.mock('../utils/audit.js', () => ({
  writeAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../utils/otpEmail.js', () => ({
  generateOtp: jest.fn(() => '123456'),
  hashOtp: jest.fn((otp) => `hashed:${otp}`),
  getOtpExpiryDate: jest.fn(() => new Date(Date.now() + 10 * 60 * 1000)),
  isOtpExpired: jest.fn(() => false),
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

import User from '../models/User.js';
import { writeAudit } from '../utils/audit.js';
import { requestForgotPasswordOtp } from '../controllers/authController.js';

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController audit writes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes audit log when forgot-password OTP is issued', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      password: 'hashed_pw',
      passwordReset: {},
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findOne.mockResolvedValue(user);

    const req = {
      body: { email: 'user@example.com' },
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
    };
    const res = createRes();

    await requestForgotPasswordOtp(req, res);

    expect(res.json).toHaveBeenCalled();
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_FORGOT_PASSWORD_OTP_REQUESTED',
        target: 'user',
        targetId: user._id,
      })
    );
  });
});
