import { validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import { authenticator as totpAuthenticator } from 'otplib';
import qrcode from 'qrcode';
import Order from '../models/Order.js';
import PendingRegistration from '../models/PendingRegistration.js';
import RefreshSession from '../models/RefreshSession.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { writeAudit } from '../utils/audit.js';
import { comparePassword, generateMfaToken, generateRefreshToken, generateToken, hashPassword, verifyToken } from '../utils/auth.js';
import logger from '../utils/logger.js';
import { decryptSecret, encryptSecret, findRecoveryCodeIndex, generateRecoveryCodes, hashRecoveryCodes } from '../utils/mfa.js';
import { generateOtp, getOtpExpiryDate, hashOtp, isOtpExpired, sendAccountExistsEmail, sendOtpEmail } from '../utils/otpEmail.js';

const REFRESH_COOKIE_NAME = 'jg_rt';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
}

function parseCookies(cookieHeader = '') {
  const parsed = {};
  for (const item of cookieHeader.split(';')) {
    const [rawKey, ...valueParts] = item.split('=');
    const key = rawKey?.trim();
    if (!key) continue;
    parsed[key] = decodeURIComponent(valueParts.join('=').trim());
  }
  return parsed;
}

function getRefreshTokenFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie || '');
  return cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken || null;
}

/** Helper: create a RefreshSession and return the signed token */
async function createSession(userId, req) {
  const session = await RefreshSession.create({
    userId,
    hashedToken: 'pending', // replaced once token is signed
    deviceId: req.headers['x-device-id'] || null,
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip || null
  });
  const rawToken = generateRefreshToken(userId, session._id);
  session.hashedToken = RefreshSession.hashToken(rawToken);
  await session.save();
  return { session, rawToken };
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function toAuthUser(user) {
  return {
    id: user._id,
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    businessName: user.businessName,
    avatar: user.avatar,
    vendorRequest: user.vendorRequest,
    mfa: { enabled: !!user.mfa?.enabled },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

// Register is blocked unless OTP verification is completed.
export const register = async (_req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Email verification is required before registration. Use /api/auth/register/request-otp and /api/auth/register/verify-otp.'
  });
};

export const requestRegisterOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const email = String(req.body.email).toLowerCase().trim();
    const { password, fullName, phone, affiliatedBy } = req.body;
    const neutralResponse = {
      success: true,
      message: 'If the email is valid, a verification OTP has been sent.'
    };

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await sendAccountExistsEmail({ to: email });
      return res.json(neutralResponse);
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = getOtpExpiryDate();
    const passwordHash = await hashPassword(password);

    const update = {
      fullName,
      phone,
      passwordHash,
      otpHash,
      otpExpiresAt
    };

    if (affiliatedBy) {
      const parentUser = await User.findById(affiliatedBy);
      if (parentUser) {
        update.affiliatedBy = affiliatedBy;
      }
    }

    await PendingRegistration.findOneAndUpdate(
      { email },
      { email, ...update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail({
      to: email,
      subject: 'Verify your JutaGhar account',
      purpose: 'your account registration',
      otp
    });

    res.json(neutralResponse);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const verifyRegisterOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const email = String(req.body.email).toLowerCase().trim();
    const otp = String(req.body.otp).trim();

    const pendingRegistration = await PendingRegistration.findOne({ email });
    if (!pendingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email'
      });
    }

    if (isOtpExpired(pendingRegistration.otpExpiresAt)) {
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    // Lockout check
    if (pendingRegistration.lockedUntil && pendingRegistration.lockedUntil > new Date()) {
      return res.status(429).json({ success: false, message: 'Too many incorrect OTP attempts. Try again in 15 minutes.' });
    }

    if (pendingRegistration.otpHash !== hashOtp(otp)) {
      pendingRegistration.attempts = (pendingRegistration.attempts || 0) + 1;
      if (pendingRegistration.attempts >= 5) {
        pendingRegistration.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await pendingRegistration.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Correct OTP — reset counters
    pendingRegistration.attempts = 0;
    pendingRegistration.lockedUntil = null;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const userData = {
      email,
      password: pendingRegistration.passwordHash,
      fullName: pendingRegistration.fullName,
      phone: pendingRegistration.phone,
      role: 'customer',
      status: 'active',
      emailVerified: true,
      emailVerification: {
        otpHash: null,
        otpExpiresAt: null,
        pendingPassword: null
      }
    };

    if (pendingRegistration.affiliatedBy) {
      userData.affiliatedBy = pendingRegistration.affiliatedBy;
      userData.affiliations = [{
        parentId: pendingRegistration.affiliatedBy,
        level: 1,
        commissionRate: 5
      }];
    }

    const user = await User.create(userData);
    const accessToken = generateToken(user._id, user.role);
    const { rawToken: refreshToken } = await createSession(user._id, req);
    setRefreshCookie(res, refreshToken);
    await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

    res.status(201).json({
      success: true,
      data: {
        user: toAuthUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      await writeAudit({
        req,
        action: 'AUTH_LOGIN_FAILED',
        target: 'user',
        metadata: { email, reason: 'user_not_found' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      await writeAudit({
        req,
        actor: String(user._id),
        action: 'AUTH_LOGIN_FAILED',
        target: 'user',
        targetId: user._id,
        metadata: { email, reason: 'invalid_password' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (user.status === 'suspended') {
      await writeAudit({
        req,
        actor: String(user._id),
        action: 'AUTH_LOGIN_FAILED',
        target: 'user',
        targetId: user._id,
        metadata: { email, reason: 'suspended' },
      });
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    if (user.status === 'pending' && user.role === 'seller') {
      await writeAudit({
        req,
        actor: String(user._id),
        action: 'AUTH_LOGIN_FAILED',
        target: 'user',
        targetId: user._id,
        metadata: { email, reason: 'seller_pending_approval' },
      });
      return res.status(403).json({
        success: false,
        message: 'Account is pending approval'
      });
    }

    if (user.emailVerified === false) {
      await writeAudit({
        req,
        actor: String(user._id),
        action: 'AUTH_LOGIN_FAILED',
        target: 'user',
        targetId: user._id,
        metadata: { email, reason: 'email_not_verified' },
      });
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before login'
      });
    }

    // MFA gate for privileged roles
    if (['admin', 'manager', 'seller'].includes(user.role) && user.mfa?.enabled) {
      const mfa_token = generateMfaToken(user._id);
      await writeAudit({
        req,
        actor: String(user._id),
        action: 'AUTH_LOGIN_SUCCESS',
        target: 'user',
        targetId: user._id,
        metadata: { email, mfaRequired: true },
      });
      return res.json({ success: true, mfa_required: true, mfa_token });
    }

    // Generate tokens
    const accessToken = generateToken(user._id, user.role);
    const { rawToken: refreshToken } = await createSession(user._id, req);
    setRefreshCookie(res, refreshToken);

    await writeAudit({
      req,
      actor: String(user._id),
      action: 'AUTH_LOGIN_SUCCESS',
      target: 'user',
      targetId: user._id,
      metadata: { email, mfaRequired: false },
    });

    res.json({
      success: true,
      data: {
        user: toAuthUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const rawToken = getRefreshTokenFromRequest(req);

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = verifyToken(rawToken);
    if (!decoded || !decoded.sid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const hashedToken = RefreshSession.hashToken(rawToken);
    const session = await RefreshSession.findOne({ _id: decoded.sid, hashedToken });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // ── Reuse detection ──────────────────────────────────────────────────────
    if (session.revokedAt) {
      await RefreshSession.updateMany(
        { userId: session.userId, revokedAt: null },
        { revokedAt: new Date() }
      );
      logger.warn({ userId: String(session.userId) }, '[SECURITY] Refresh token reuse detected — all sessions revoked');
      return res.status(401).json({
        success: false,
        message: 'Refresh token already used. All sessions have been revoked for security.'
      });
    }

    const user = await User.findById(session.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    // ── Rotate: revoke old, create new ──────────────────────────────────────
    const { session: newSession, rawToken: newRefreshToken } = await createSession(user._id, req);
    session.revokedAt = new Date();
    session.replacedBy = newSession._id;
    await session.save();
    setRefreshCookie(res, newRefreshToken);

    const newAccessToken = generateToken(user._id, user.role);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -passwordReset -passwordChange -emailVerification -mfa.secret -mfa.pendingSecret -mfa.recoveryCodes');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const rawToken = getRefreshTokenFromRequest(req);
    if (rawToken) {
      const decoded = verifyToken(rawToken);
      if (decoded?.sid) {
        await RefreshSession.findOneAndUpdate(
          { _id: decoded.sid, userId: req.user._id, revokedAt: null },
          { revokedAt: new Date() }
        );
      }
    }
    clearRefreshCookie(res);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone },
      { new: true, runValidators: true }
    ).select('-password -passwordReset -passwordChange -emailVerification');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const requestForgotPasswordOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const email = String(req.body.email).toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.json({
        success: true,
        message: 'If your email is registered, OTP instructions have been sent.'
      });
    }

    const otp = generateOtp();
    user.passwordReset = {
      otpHash: hashOtp(otp),
      otpExpiresAt: getOtpExpiryDate(),
      pendingPassword: null
    };
    await user.save();

    await sendOtpEmail({
      to: user.email,
      subject: 'Reset your JutaGhar password',
      purpose: 'your password reset',
      otp
    });

    await writeAudit({
      req,
      actor: String(user._id),
      action: 'AUTH_FORGOT_PASSWORD_OTP_REQUESTED',
      target: 'user',
      targetId: user._id,
      metadata: { email: user.email },
    });

    res.json({
      success: true,
      message: 'If your email is registered, OTP instructions have been sent.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const email = String(req.body.email).toLowerCase().trim();
    const otp = String(req.body.otp).trim();
    const newPassword = String(req.body.newPassword);

    const user = await User.findOne({ email });
    if (!user || !user.passwordReset?.otpHash) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP request' });
    }

    if (isOtpExpired(user.passwordReset.otpExpiresAt)) {
      user.passwordReset = { otpHash: null, otpExpiresAt: null, pendingPassword: null, attempts: 0, lockedUntil: null };
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
    }

    // Lockout check
    if (user.passwordReset.lockedUntil && user.passwordReset.lockedUntil > new Date()) {
      return res.status(429).json({ success: false, message: 'Too many incorrect OTP attempts. Try again in 15 minutes.' });
    }

    if (user.passwordReset.otpHash !== hashOtp(otp)) {
      user.passwordReset.attempts = (user.passwordReset.attempts || 0) + 1;
      if (user.passwordReset.attempts >= 5) {
        user.passwordReset.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Correct OTP — reset counters and update password
    user.password = await hashPassword(newPassword);
    user.passwordReset = { otpHash: null, otpExpiresAt: null, pendingPassword: null, attempts: 0, lockedUntil: null };
    await user.save();

    await writeAudit({
      req,
      actor: String(user._id),
      action: 'AUTH_FORGOT_PASSWORD_RESET_VERIFIED',
      target: 'user',
      targetId: user._id,
      metadata: { email: user.email },
    });

    res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Google Sign-In / Sign-Up
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not available from Google account'
      });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link Google account if user exists by email but not yet linked
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        email,
        fullName: name || email.split('@')[0],
        googleId,
        avatar: picture,
        role: 'customer',
        status: 'active',
        emailVerified: true,
      });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    if (user.status === 'pending' && user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Account is pending approval'
      });
    }

    // Generate tokens
    const accessToken = generateToken(user._id, user.role);
    const { rawToken: refreshToken } = await createSession(user._id, req);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        user: toAuthUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Request vendor status (user requests to become an outlet from profile)
export const requestVendor = async (req, res) => {
  try {
    const { businessName, businessAddress, taxId } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Only customers can request seller status
    if (user.role !== 'customer') {
      return res.status(400).json({
        success: false,
        message: 'Only customers can request seller status'
      });
    }

    // Check if there's already a pending request
    if (user.vendorRequest?.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending vendor request'
      });
    }

    user.vendorRequest = {
      status: 'pending',
      businessName: businessName.trim(),
      businessAddress: businessAddress?.trim() || '',
      taxId: taxId?.trim() || '',
      requestedAt: new Date(),
    };
    await user.save();

    res.json({
      success: true,
      message: 'Vendor request submitted successfully. You will be notified once approved.',
      data: { vendorRequest: user.vendorRequest }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Admin: approve or reject vendor request
export const reviewVendorRequest = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be approve or reject'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.vendorRequest?.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending vendor request for this user'
      });
    }

    if (action === 'approve') {
      // Promote customer to seller
      user.role = 'seller';
      user.businessName = user.vendorRequest.businessName;
      user.businessAddress = user.vendorRequest.businessAddress;
      user.taxId = user.vendorRequest.taxId;
      user.approvedAt = new Date();
      user.approvedBy = req.user._id;
      user.vendorRequest.status = 'approved';
      user.vendorRequest.reviewedAt = new Date();
      user.vendorRequest.reviewedBy = req.user._id;
    } else {
      user.vendorRequest.status = 'rejected';
      user.vendorRequest.rejectionReason = rejectionReason || '';
      user.vendorRequest.reviewedAt = new Date();
      user.vendorRequest.reviewedBy = req.user._id;
    }

    await user.save();

    await writeAudit({
      req,
      action: action === 'approve' ? 'AUTH_VENDOR_REQUEST_APPROVED' : 'AUTH_VENDOR_REQUEST_REJECTED',
      target: 'user',
      targetId: user._id,
      metadata: {
        reviewerId: String(req.user._id),
        roleAfterReview: user.role,
        vendorRequestStatus: user.vendorRequest?.status,
        rejectionReason: action === 'reject' ? (rejectionReason || '') : undefined,
      },
    });

    res.json({
      success: true,
      message: `Vendor request ${action}d successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Admin: get all pending vendor requests
export const getVendorRequests = async (req, res) => {
  try {
    const users = await User.find({
      'vendorRequest.status': 'pending'
    }).select('-password -passwordReset -passwordChange -emailVerification').sort('-vendorRequest.requestedAt');

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Delete own account and associated data
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Require password confirmation (skip for Google-only accounts)
    if (user.password) {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required to delete your account' });
      }
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password' });
      }
    }

    // Prevent admin/seller from self-deleting via this endpoint
    if (user.role === 'admin' || user.role === 'seller') {
      return res.status(403).json({ success: false, message: 'Admin and seller accounts cannot be deleted via this endpoint. Please contact support.' });
    }

    // Delete user's reviews
    await Review.deleteMany({ user: userId });

    // Anonymize orders (keep orders for accounting, remove user reference)
    await Order.updateMany({ user: userId }, { $set: { 'shippingAddress.fullName': 'Deleted User', 'shippingAddress.phone': '', 'shippingAddress.address': '' } });

    // Delete the user
    await User.findByIdAndDelete(userId);

    await writeAudit({
      req,
      actor: String(userId),
      action: 'AUTH_ACCOUNT_DELETED',
      target: 'user',
      targetId: userId,
      metadata: { email: user.email, role: user.role },
    });

    res.json({ success: true, message: 'Account and associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// ─── MFA endpoints ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/mfa/setup
 * Generates a new TOTP secret and stores it temporarily (not yet enabled).
 * Returns the otpauth URI and a QR code data URL.
 */
export const setupMfa = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const secret = totpAuthenticator.generateSecret();
    const otpauthUri = totpAuthenticator.keyuri(user.email, 'JutaGhar', secret);
    const qrDataUrl = await qrcode.toDataURL(otpauthUri);

    // Store encrypted pending secret (not enabled until /mfa/verify succeeds)
    user.mfa = user.mfa || {};
    user.mfa.pendingSecret = encryptSecret(secret);
    user.mfa.enabled = user.mfa.enabled || false;
    await user.save();

    res.json({ success: true, data: { otpauthUri, qrDataUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

/**
 * POST /api/auth/mfa/verify
 * Verifies the first TOTP code; if valid, activates MFA and returns recovery codes.
 */
export const verifyMfaSetup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.mfa?.pendingSecret) {
      return res.status(400).json({ success: false, message: 'No MFA setup in progress. Call /mfa/setup first.' });
    }

    const { code } = req.body;
    const secret = decryptSecret(user.mfa.pendingSecret);

    if (!totpAuthenticator.check(String(code), secret)) {
      return res.status(400).json({ success: false, message: 'Invalid TOTP code' });
    }

    // Activate MFA
    const plainCodes = generateRecoveryCodes();
    const hashedCodes = await hashRecoveryCodes(plainCodes);

    user.mfa.secret = encryptSecret(secret);
    user.mfa.pendingSecret = undefined;
    user.mfa.enabled = true;
    user.mfa.recoveryCodes = hashedCodes;
    await user.save();

    // Return plain codes once — never stored in plain text
    res.json({ success: true, data: { recoveryCodes: plainCodes } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

/**
 * POST /api/auth/mfa/disable
 * Requires current password and a valid TOTP code (or recovery code).
 */
export const disableMfa = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.mfa?.enabled) {
      return res.status(400).json({ success: false, message: 'MFA is not enabled' });
    }

    const { password, code } = req.body;

    // Verify password
    const passwordMatch = user.password ? await comparePassword(password, user.password) : false;
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Verify TOTP code or recovery code
    const secret = decryptSecret(user.mfa.secret);
    const totpValid = totpAuthenticator.check(String(code), secret);

    if (!totpValid) {
      // Try recovery codes
      const idx = await findRecoveryCodeIndex(String(code), user.mfa.recoveryCodes);
      if (idx === -1) {
        return res.status(400).json({ success: false, message: 'Invalid code' });
      }
      user.mfa.recoveryCodes.splice(idx, 1);
    }

    user.mfa.enabled = false;
    user.mfa.secret = undefined;
    user.mfa.recoveryCodes = [];
    await user.save();

    res.json({ success: true, message: 'MFA disabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

/**
 * POST /api/auth/mfa/login-verify
 * Second step of MFA login: accepts the short-lived mfa_token + TOTP code,
 * then issues real access and refresh tokens.
 */
export const loginVerifyMfa = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mfa_token, code } = req.body;

    // Verify the short-lived MFA token
    const decoded = verifyToken(mfa_token);
    if (!decoded || decoded.purpose !== 'mfa') {
      return res.status(401).json({ success: false, message: 'Invalid or expired MFA token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.mfa?.enabled || !user.mfa?.secret) {
      return res.status(401).json({ success: false, message: 'Invalid MFA state' });
    }

    const secret = decryptSecret(user.mfa.secret);
    const totpValid = totpAuthenticator.check(String(code), secret);

    if (!totpValid) {
      // Try recovery codes
      const idx = await findRecoveryCodeIndex(String(code), user.mfa.recoveryCodes);
      if (idx === -1) {
        return res.status(400).json({ success: false, message: 'Invalid code' });
      }
      // Consume the recovery code
      user.mfa.recoveryCodes.splice(idx, 1);
      await user.save();
    }

    // Issue real tokens
    const accessToken = generateToken(user._id, user.role);
    const { rawToken: refreshToken } = await createSession(user._id, req);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        user: toAuthUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// ─── Change Password (authenticated, OTP-confirmed) ──────────────────────────

export const requestChangePasswordOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Must have a password-based account
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Password change is not available for social-login accounts' });
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must differ from the current password' });
    }

    // Store hashed new password temporarily and send OTP
    const otp = generateOtp();
    user.passwordChange = {
      otpHash: hashOtp(otp),
      otpExpiresAt: getOtpExpiryDate(),
      pendingPassword: await hashPassword(newPassword),
      attempts: 0,
      lockedUntil: null,
    };
    await user.save();

    await sendOtpEmail({
      to: user.email,
      subject: 'Confirm your JutaGhar password change',
      purpose: 'your password change',
      otp,
    });

    await writeAudit({
      req,
      actor: String(user._id),
      action: 'AUTH_CHANGE_PASSWORD_OTP_REQUESTED',
      target: 'user',
      targetId: user._id,
      metadata: { email: user.email },
    });

    res.json({ success: true, message: 'OTP sent to your email. Enter it to confirm the password change.' });
  } catch (error) {
    logger.error('requestChangePasswordOtp error', { error });
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const verifyChangePasswordOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const otp = String(req.body.otp).trim();
    const user = await User.findById(req.user._id);
    if (!user || !user.passwordChange?.otpHash) {
      return res.status(400).json({ success: false, message: 'No pending password change. Please start over.' });
    }

    if (isOtpExpired(user.passwordChange.otpExpiresAt)) {
      user.passwordChange = { otpHash: null, otpExpiresAt: null, pendingPassword: null, attempts: 0, lockedUntil: null };
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (user.passwordChange.lockedUntil && user.passwordChange.lockedUntil > new Date()) {
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Try again in 15 minutes.' });
    }

    if (user.passwordChange.otpHash !== hashOtp(otp)) {
      user.passwordChange.attempts = (user.passwordChange.attempts || 0) + 1;
      if (user.passwordChange.attempts >= 5) {
        user.passwordChange.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Apply the pending hashed password and clear the change state
    user.password = user.passwordChange.pendingPassword;
    user.passwordChange = { otpHash: null, otpExpiresAt: null, pendingPassword: null, attempts: 0, lockedUntil: null };
    await user.save();

    await writeAudit({
      req,
      actor: String(user._id),
      action: 'AUTH_CHANGE_PASSWORD_VERIFIED',
      target: 'user',
      targetId: user._id,
      metadata: { email: user.email },
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('verifyChangePasswordOtp error', { error });
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};
