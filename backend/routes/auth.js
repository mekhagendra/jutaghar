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
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
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
  body('newPassword').isLength({ min: 6 })
];

const requestChangePasswordValidation = [
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 6 })
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

export default router;
