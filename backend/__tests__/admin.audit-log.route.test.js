process.env.JWT_SECRET = 'test-jwt-secret';

jest.mock('../models/User.js');
jest.mock('../models/AuditLog.js');
jest.mock('../utils/auth.js', () => ({
  verifyToken: jest.fn(() => ({ id: '507f1f77bcf86cd799439011' })),
}));

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import adminRouter from '../routes/admin.js';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('GET /api/admin/audit-log', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        role: 'admin',
        status: 'active',
      }),
    });

    AuditLog.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              actor: '507f1f77bcf86cd799439011',
              action: 'ADMIN_USER_ROLE_UPDATED',
              target: 'user',
              metadata: { toRole: 'outlet' },
              createdAt: new Date(),
            },
          ]),
        }),
      }),
    });
    AuditLog.countDocuments = jest.fn().mockResolvedValue(1);
  });

  it('returns paginated audit entries for admin JWT', async () => {
    const res = await request(app)
      .get('/api/admin/audit-log?action=ADMIN_USER_ROLE_UPDATED&actor=507f1f77bcf86cd799439011&page=1&limit=10')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination.total).toBe(1);
    expect(Array.isArray(res.body.data.entries)).toBe(true);
    expect(AuditLog.find).toHaveBeenCalledWith({
      action: 'ADMIN_USER_ROLE_UPDATED',
      actor: '507f1f77bcf86cd799439011',
    });
  });
});
