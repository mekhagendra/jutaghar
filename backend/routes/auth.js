import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  authLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  refreshLimiter
} from '../middleware/rateLimiters.js';

const router = express.Router();

// Validation rules
const PASSWORD_COMPLEXITY = /(?=.*\d)(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9])/;
const PASSWORD_MESSAGE = 'Password must be at least 10 characters and include a letter, digit, and symbol';

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 10 }).withMessage(PASSWORD_MESSAGE)
    .matches(PASSWORD_COMPLEXITY).withMessage(PASSWORD_MESSAGE),
  body('fullName').trim().notEmpty(),
  body('phone').trim().notEmpty()
];

const verifyOtpValidation = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 4, max: 8 }).trim()
];

const forgotPasswordVerifyValidation = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 4, max: 8 }).trim(),
  body('newPassword').isLength({ min: 10 }).withMessage(PASSWORD_MESSAGE)
    .matches(PASSWORD_COMPLEXITY).withMessage(PASSWORD_MESSAGE)
];

const requestChangePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 10 }).withMessage(PASSWORD_MESSAGE)
    .matches(PASSWORD_COMPLEXITY).withMessage(PASSWORD_MESSAGE)
];

const verifyChangePasswordValidation = [
  body('otp').isLength({ min: 4, max: 8 }).trim()
];

const updateProfileValidation = [
  body('fullName').trim().notEmpty(),
  body('phone').trim().notEmpty()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/register/request-otp', authLimiter, registerValidation, authController.requestRegisterOtp);
router.post('/register/verify-otp', authLimiter, otpVerifyLimiter, verifyOtpValidation, authController.verifyRegisterOtp);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/google', authLimiter, authController.googleLogin);
router.post('/apple', authLimiter, authController.appleLogin);
router.post('/forgot-password/request-otp', otpRequestLimiter, [body('email').isEmail().normalizeEmail()], authController.requestForgotPasswordOtp);
router.post('/forgot-password/verify-otp', otpVerifyLimiter, forgotPasswordVerifyValidation, authController.verifyForgotPasswordOtp);
router.post('/refresh', refreshLimiter, authController.refreshToken);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.put('/profile', authenticate, updateProfileValidation, authController.updateProfile);
router.post('/change-password/request-otp', authenticate, otpRequestLimiter, requestChangePasswordValidation, authController.requestChangePasswordOtp);
router.post('/change-password/verify-otp', authenticate, otpVerifyLimiter, verifyChangePasswordValidation, authController.verifyChangePasswordOtp);
router.delete('/account', authenticate, authController.deleteAccount);

// Vendor request (authenticated users)
router.post('/vendor-request', authenticate, authController.requestVendor);

// Admin: manage vendor requests
router.get('/vendor-requests', authenticate, requireAdmin, authController.getVendorRequests);
router.patch('/vendor-requests/:id', authenticate, requireAdmin, authController.reviewVendorRequest);

// MFA routes
const mfaDisableValidation = [
  body('password').notEmpty(),
  body('code').notEmpty()
];
const mfaLoginVerifyValidation = [
  body('mfa_token').notEmpty(),
  body('code').notEmpty()
];

router.post('/mfa/setup', authenticate, authController.setupMfa);
router.post('/mfa/verify', authenticate, [body('code').notEmpty()], authController.verifyMfaSetup);
router.post('/mfa/disable', authenticate, mfaDisableValidation, authController.disableMfa);
router.post('/mfa/login-verify', authLimiter, mfaLoginVerifyValidation, authController.loginVerifyMfa);

export default router;
