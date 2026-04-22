import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate JWT token
export const generateToken = (userId, role, jti) => {
  return jwt.sign(
    { id: userId, role, jti: jti || crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

// Generate refresh token
export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    { id: userId, sid: sessionId, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '90d' }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Hash password
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare password
export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate short-lived MFA challenge token (5 min, purpose: 'mfa')
export const generateMfaToken = (userId) => {
  return jwt.sign(
    { id: userId, purpose: 'mfa' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
};
