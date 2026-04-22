jest.mock('../models/User.js');
jest.mock('../utils/audit.js', () => ({
  writeAudit: jest.fn().mockResolvedValue(undefined),
}));

import User from '../models/User.js';
import { writeAudit } from '../utils/audit.js';
import { updateUserRole } from '../controllers/adminController.js';

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('adminController audit writes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes audit log when user role is updated', async () => {
    const userId = '507f1f77bcf86cd799439012';
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: 'user' }),
    });
    User.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId, role: 'outlet' }),
    });

    const req = {
      params: { id: userId },
      body: { role: 'outlet' },
      user: { _id: '507f1f77bcf86cd799439099' },
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
    };
    const res = createRes();

    await updateUserRole(req, res);

    expect(res.json).toHaveBeenCalled();
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_USER_ROLE_UPDATED',
        target: 'user',
      })
    );
  });
});
