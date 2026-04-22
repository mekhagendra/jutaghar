process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ESEWA_SECRET_KEY = 'test-esewa-key';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASSWORD = 'test-pass';
process.env.GOOGLE_CLIENT_ID = 'test-google-id';

jest.mock('../models/User.js');
jest.mock('../models/PendingRegistration.js');
jest.mock('../models/RefreshSession.js');
jest.mock('../models/Order.js');
jest.mock('../models/Review.js');
jest.mock('../utils/otpEmail.js', () => ({
  generateOtp: jest.fn(() => '123456'),
  hashOtp: jest.fn((otp) => `hashed:${otp}`),
  isOtpExpired: jest.fn(() => false),
  getOtpExpiryDate: jest.fn(() => new Date(Date.now() + 10 * 60 * 1000)),
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountExistsEmail: jest.fn().mockResolvedValue(undefined),
}));

import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import {
  sendOtpEmail,
  sendAccountExistsEmail,
} from '../utils/otpEmail.js';
import { requestRegisterOtp } from '../controllers/authController.js';

function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requestRegisterOtp enumeration-safe behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the same neutral response for existing and new emails, with different side effects', async () => {
    const reqExisting = {
      body: {
        email: 'existing@example.com',
        password: 'Strong@Pass123',
        fullName: 'Existing User',
        phone: '9800000000',
      },
    };
    const reqNew = {
      body: {
        email: 'new@example.com',
        password: 'Strong@Pass123',
        fullName: 'New User',
        phone: '9800000001',
      },
    };

    User.findOne
      .mockResolvedValueOnce({ _id: 'u1', email: 'existing@example.com' })
      .mockResolvedValueOnce(null);
    PendingRegistration.findOneAndUpdate.mockResolvedValue({ _id: 'p1' });

    const resExisting = createMockRes();
    const resNew = createMockRes();

    await requestRegisterOtp(reqExisting, resExisting);
    await requestRegisterOtp(reqNew, resNew);

    const expectedResponse = {
      success: true,
      message: 'If the email is valid, a verification OTP has been sent.',
    };

    expect(resExisting.status).not.toHaveBeenCalledWith(400);
    expect(resExisting.json).toHaveBeenCalledWith(expectedResponse);
    expect(resNew.json).toHaveBeenCalledWith(expectedResponse);

    expect(sendAccountExistsEmail).toHaveBeenCalledTimes(1);
    expect(sendAccountExistsEmail).toHaveBeenCalledWith({ to: 'existing@example.com' });

    expect(PendingRegistration.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(sendOtpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@example.com', otp: '123456' })
    );
  });
});
