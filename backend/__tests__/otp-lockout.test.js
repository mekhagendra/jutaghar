/**
 * Unit tests for OTP attempt lockout logic.
 *
 * Acceptance criteria:
 *  1. Submitting 5 wrong OTPs locks the record for 15 minutes (→ 429 on 6th).
 *  2. Submitting the correct OTP before the lock threshold succeeds and resets
 *     the attempt counter.
 *
 * We test the logic directly by calling the route handlers through a minimal
 * Express app, with all Mongoose models mocked.
 */

process.env.JWT_SECRET          = 'test-jwt-secret';
process.env.ESEWA_SECRET_KEY    = 'test-esewa-key';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';
process.env.SMTP_USER           = 'test@example.com';
process.env.SMTP_PASSWORD       = 'test-pass';
process.env.GOOGLE_CLIENT_ID    = 'test-google-id';

jest.mock('../models/User.js');
jest.mock('../models/PendingRegistration.js');
jest.mock('../models/Order.js');
jest.mock('../models/RefreshSession.js');
jest.mock('../utils/otpEmail.js', () => ({
  generateOtp: jest.fn(() => '123456'),
  hashOtp: jest.fn((otp) => `hashed:${otp}`),
  isOtpExpired: jest.fn(() => false),
  getOtpExpiryDate: jest.fn(() => new Date(Date.now() + 10 * 60 * 1000)),
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import authRouter from '../routes/auth.js';
import RefreshSession from '../models/RefreshSession.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

function makeToken(userId, role = 'user') {
  return jwt.sign({ id: String(userId), role }, process.env.JWT_SECRET);
}

// ── verifyRegisterOtp lockout ─────────────────────────────────────────────────
describe('POST /api/auth/register/verify-otp — lockout', () => {
  const email = 'reg@example.com';

  function makePending(overrides = {}) {
    return {
      _id: new mongoose.Types.ObjectId(),
      email,
      passwordHash: 'hash',
      fullName: 'Test',
      phone: '123',
      otpHash: 'hashed:123456',
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lockedUntil: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  test('4 wrong OTPs → still 400, not locked yet', async () => {
    const pending = makePending({ attempts: 4 });
    PendingRegistration.findOne.mockResolvedValue(pending);

    const res = await request(app)
      .post('/api/auth/register/verify-otp')
      .send({ email, otp: 'wrong1' });

    expect(res.status).toBe(400);
    expect(pending.attempts).toBe(5);
    expect(pending.lockedUntil).toBeInstanceOf(Date);
    expect(pending.save).toHaveBeenCalled();
  });

  test('6th attempt when lockedUntil is in the future → 429', async () => {
    const pending = makePending({
      attempts: 5,
      lockedUntil: new Date(Date.now() + 14 * 60 * 1000),
    });
    PendingRegistration.findOne.mockResolvedValue(pending);

    const res = await request(app)
      .post('/api/auth/register/verify-otp')
      .send({ email, otp: 'wrong1' });

    expect(res.status).toBe(429);
  });

  test('correct OTP before lockout → 201, attempts reset', async () => {
    const userId = new mongoose.Types.ObjectId();
    const pending = makePending({ attempts: 2 });
    PendingRegistration.findOne.mockResolvedValue(pending);

    // No existing user
    User.findOne.mockResolvedValue(null);

    // User.create mock
    const savedUser = {
      _id: userId,
      email,
      fullName: 'Test',
      role: 'user',
      status: 'active',
      emailVerified: true,
      refreshToken: null,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({}),
    };
    User.create.mockResolvedValue(savedUser);

    PendingRegistration.deleteOne = jest.fn().mockResolvedValue(undefined);

    // createSession calls RefreshSession.create then session.save()
    const mockSession = {
      _id: new mongoose.Types.ObjectId(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    RefreshSession.create.mockResolvedValue(mockSession);
    RefreshSession.hashToken.mockReturnValue('test-hash');

    const res = await request(app)
      .post('/api/auth/register/verify-otp')
      .send({ email, otp: '123456' });

    expect(res.status).toBe(201);
    // Counter was reset before save (attempts reset to 0)
    expect(pending.attempts).toBe(0);
    expect(pending.lockedUntil).toBeNull();
  });
});

// ── verifyForgotPasswordOtp lockout ───────────────────────────────────────────
describe('POST /api/auth/forgot-password/verify-otp — lockout', () => {
  const email = 'forgot@example.com';

  function makeUser(overrides = {}) {
    const base = {
      _id: new mongoose.Types.ObjectId(),
      email,
      password: 'hashed_old',
      passwordReset: {
        otpHash: 'hashed:123456',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        lockedUntil: null,
      },
      refreshToken: 'old_refresh',
      save: jest.fn().mockResolvedValue(undefined),
    };
    return { ...base, ...overrides };
  }

  test('5th wrong OTP sets lockedUntil, returns 400', async () => {
    const user = makeUser();
    user.passwordReset.attempts = 4;
    User.findOne.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/auth/forgot-password/verify-otp')
        .send({ email, otp: '0000', newPassword: 'newP@ss001' });

    expect(res.status).toBe(400);
    expect(user.passwordReset.attempts).toBe(5);
    expect(user.passwordReset.lockedUntil).toBeInstanceOf(Date);
  });

  test('attempt while locked → 429', async () => {
    const user = makeUser();
    user.passwordReset.attempts = 5;
    user.passwordReset.lockedUntil = new Date(Date.now() + 14 * 60 * 1000);
    User.findOne.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/auth/forgot-password/verify-otp')
        .send({ email, otp: '0000', newPassword: 'newP@ss001' });

    expect(res.status).toBe(429);
  });

  test('correct OTP → 200, resets attempts', async () => {
    const user = makeUser();
    user.passwordReset.attempts = 3;
    User.findOne.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/auth/forgot-password/verify-otp')
        .send({ email, otp: '123456', newPassword: 'newP@ss001' });

    expect(res.status).toBe(200);
    expect(user.passwordReset.attempts).toBe(0);
    expect(user.passwordReset.lockedUntil).toBeNull();
  });
});

// ── verifyChangePasswordOtp lockout ───────────────────────────────────────────
describe('POST /api/auth/change-password/verify-otp — lockout', () => {
  // authenticate calls User.findById(id).select(...)
  // controller calls await User.findById(id)  (no .select)
  // Both must resolve to the same mock user.
  function mockFindById(user) {
    const thenable = Promise.resolve(user);
    thenable.select = jest.fn().mockResolvedValue(user);
    User.findById.mockReturnValue(thenable);
  }

  function makeAuthUser(overrides = {}) {
    const userId = new mongoose.Types.ObjectId();
    return {
      _id: userId,
      email: 'change@example.com',
      password: 'hashed_old',
      isActive: true,
      status: 'active',
      emailVerified: true,
      passwordChange: {
        otpHash: 'hashed:123456',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        pendingPassword: 'hashed_new',
        attempts: 0,
        lockedUntil: null,
      },
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  test('5th wrong OTP sets lockedUntil, returns 400', async () => {
    const user = makeAuthUser();
    user.passwordChange.attempts = 4;
    mockFindById(user);
    const token = makeToken(user._id);

    const res = await request(app)
      .post('/api/auth/change-password/verify-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ otp: '0000' });

    expect(res.status).toBe(400);
    expect(user.passwordChange.attempts).toBe(5);
    expect(user.passwordChange.lockedUntil).toBeInstanceOf(Date);
  });

  test('attempt while locked → 429', async () => {
    const user = makeAuthUser();
    user.passwordChange.attempts = 5;
    user.passwordChange.lockedUntil = new Date(Date.now() + 14 * 60 * 1000);
    mockFindById(user);
    const token = makeToken(user._id);

    const res = await request(app)
      .post('/api/auth/change-password/verify-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ otp: '0000' });

    expect(res.status).toBe(429);
  });

  test('correct OTP → 200, resets attempts', async () => {
    const user = makeAuthUser();
    user.passwordChange.attempts = 2;
    mockFindById(user);
    const token = makeToken(user._id);

    const res = await request(app)
      .post('/api/auth/change-password/verify-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ otp: '123456' });

    expect(res.status).toBe(200);
    expect(user.passwordChange.attempts).toBe(0);
    expect(user.passwordChange.lockedUntil).toBeNull();
  });
});
