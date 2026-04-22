/**
 * Integration tests for F-10/F-23/F-29: Refresh-token rotation with reuse detection.
 *
 * Acceptance criteria:
 *  1. Happy path: a valid refresh token → rotated; new tokens returned.
 *  2. Reuse detection: replaying an already-used (revokedAt set) token → 401,
 *     every other open session for that user is also revoked.
 *  3. Invalid/unsigned token → 401.
 *  4. Logout: supplying the refresh token marks only that session revoked.
 */

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
import RefreshSession from '../models/RefreshSession.js';
import authRouter from '../routes/auth.js';

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

/** Sign a real access token so authenticate middleware passes */
function makeAccessToken(userId, role = 'user') {
  return jwt.sign({ id: String(userId), role }, JWT_SECRET, { expiresIn: '15m' });
}

/** Sign a real refresh token with a session id, as the controller does */
function makeRefreshToken(userId, sessionId) {
  return jwt.sign(
    { id: String(userId), sid: String(sessionId), jti: 'test-jti' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

const userId = new mongoose.Types.ObjectId();

function makeUser(overrides = {}) {
  return {
    _id: userId,
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    emailVerified: true,
    ...overrides,
  };
}

// ── Happy-path rotation ──────────────────────────────────────────────────────
describe('POST /api/auth/refresh — happy path rotation', () => {
  test('valid refresh token → 200 with new access + refresh tokens', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const rawToken = makeRefreshToken(userId, sessionId);
    const hashedToken = 'test-hash-value';

    // Static hashToken always returns our sentinel
    RefreshSession.hashToken.mockReturnValue(hashedToken);

    const oldSession = {
      _id: sessionId,
      userId,
      hashedToken,
      revokedAt: null,
      replacedBy: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    RefreshSession.findOne.mockResolvedValue(oldSession);

    // createSession calls RefreshSession.create then session.save()
    const newSessionId = new mongoose.Types.ObjectId();
    const newSession = {
      _id: newSessionId,
      userId,
      hashedToken: 'new-hash',
      save: jest.fn().mockResolvedValue(undefined),
    };
    RefreshSession.create.mockResolvedValue(newSession);

    User.findById.mockResolvedValue(makeUser());

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();

    // Old session must be revoked
    expect(oldSession.revokedAt).toBeInstanceOf(Date);
    expect(oldSession.replacedBy).toEqual(newSessionId);
    expect(oldSession.save).toHaveBeenCalled();
  });
});

// ── Reuse detection ──────────────────────────────────────────────────────────
describe('POST /api/auth/refresh — reuse detection', () => {
  test('replaying already-revoked token → 401 and all sessions revoked', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const rawToken = makeRefreshToken(userId, sessionId);

    RefreshSession.hashToken.mockReturnValue('some-hash');

    // Session was already revoked
    const revokedSession = {
      _id: sessionId,
      userId,
      hashedToken: 'some-hash',
      revokedAt: new Date(Date.now() - 60_000), // revoked 1 min ago
    };
    RefreshSession.findOne.mockResolvedValue(revokedSession);
    RefreshSession.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawToken });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);

    // Must have called updateMany to nuke all open sessions
    expect(RefreshSession.updateMany).toHaveBeenCalledWith(
      { userId: revokedSession.userId, revokedAt: null },
      { revokedAt: expect.any(Date) }
    );
  });
});

// ── Invalid token ────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh — invalid token', () => {
  test('unsigned / tampered token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'this.is.garbage' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('missing refresh token → 400', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
  });

  test('valid JWT but no sid claim → 401', async () => {
    // A token without a sid (old format)
    const legacyToken = jwt.sign({ id: String(userId) }, JWT_SECRET, { expiresIn: '30d' });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: legacyToken });

    expect(res.status).toBe(401);
  });

  test('session not found in DB → 401', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const rawToken = makeRefreshToken(userId, sessionId);

    RefreshSession.hashToken.mockReturnValue('any-hash');
    RefreshSession.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawToken });

    expect(res.status).toBe(401);
  });
});

// ── Logout ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout — revokes single session', () => {
  test('valid refresh token in body → 200, session revoked', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const rawToken = makeRefreshToken(userId, sessionId);
    const accessToken = makeAccessToken(userId);

    // authenticate middleware calls User.findById(id).select(...)
    const user = makeUser();
    const p = Promise.resolve(user);
    p.select = jest.fn().mockResolvedValue(user);
    User.findById.mockReturnValue(p);

    RefreshSession.findOneAndUpdate.mockResolvedValue({ _id: sessionId, revokedAt: new Date() });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken: rawToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(RefreshSession.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.anything(), userId: user._id, revokedAt: null },
      { revokedAt: expect.any(Date) }
    );
  });

  test('logout without refresh token body → 200, no DB call', async () => {
    const accessToken = makeAccessToken(userId);

    const user = makeUser();
    const p = Promise.resolve(user);
    p.select = jest.fn().mockResolvedValue(user);
    User.findById.mockReturnValue(p);

    RefreshSession.findOneAndUpdate.mockClear();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(RefreshSession.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
