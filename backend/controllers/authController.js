import { validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyToken } from '../utils/auth.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register new user
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, fullName, phone, affiliatedBy } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // All registrations create a regular user with active status
    const userData = {
      email,
      password: hashedPassword,
      fullName,
      phone,
      role: 'user',
      status: 'active'
    };

    // Add affiliation
    if (affiliatedBy) {
      const parentUser = await User.findById(affiliatedBy);
      if (parentUser) {
        userData.affiliatedBy = affiliatedBy;
        userData.affiliations = [{
          parentId: affiliatedBy,
          level: 1,
          commissionRate: 5 // Default 5%
        }];
      }
    }

    const user = await User.create(userData);

    // Generate tokens
    const accessToken = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
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
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    if (user.status === 'pending' && user.role === 'outlet') {
      return res.status(403).json({
        success: false,
        message: 'Account is pending approval'
      });
    }

    // Generate tokens
    const accessToken = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          businessName: user.businessName
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

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
      message: error.message
    });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
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
        role: 'user',
        status: 'active',
      });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    if (user.status === 'pending' && user.role === 'outlet') {
      return res.status(403).json({
        success: false,
        message: 'Account is pending approval'
      });
    }

    // Generate tokens
    const accessToken = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          businessName: user.businessName,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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

    // Only regular users can request vendor status
    if (user.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Only regular users can request vendor status'
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
    res.status(500).json({ success: false, message: error.message });
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
      // Promote user to vendor
      user.role = user.vendorRequest.type;
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

    res.json({
      success: true,
      message: `Vendor request ${action}d successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: get all pending vendor requests
export const getVendorRequests = async (req, res) => {
  try {
    const users = await User.find({
      'vendorRequest.status': 'pending'
    }).select('-password -refreshToken').sort('-vendorRequest.requestedAt');

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
