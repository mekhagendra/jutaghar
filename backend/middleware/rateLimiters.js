import rateLimit from 'express-rate-limit';

/**
 * Key generator shared by auth and OTP limiters.
 * Combines IP with the (lowercased) email from the request body so that a
 * single IP cannot spray across many accounts, and a single account cannot be
 * brute-forced from many IPs without each IP being counted independently.
 */
const ipEmailKey = (req) =>
  `${req.ip}:${(req.body?.email || '').toLowerCase()}`;

/** POST /login, /google, /register/request-otp, /register/verify-otp */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  keyGenerator: ipEmailKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this IP/email. Please try again in 15 minutes.'
  }
});

/** POST /forgot-password/request-otp, /change-password/request-otp */
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: ipEmailKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests from this IP/email. Please try again in 15 minutes.'
  }
});

/** POST /forgot-password/verify-otp, /change-password/verify-otp, /register/verify-otp */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: ipEmailKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Please try again in 15 minutes.'
  }
});

/** POST /refresh — keyed by IP only (no email in body) */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many token refresh requests. Please try again in 15 minutes.'
  }
});
