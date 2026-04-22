jest.mock('../models/ApiClient.js');
jest.mock('../utils/audit.js', () => ({
  writeAudit: jest.fn().mockResolvedValue(undefined),
}));

import ApiClient from '../models/ApiClient.js';
import { writeAudit } from '../utils/audit.js';
import { regenerateSecret } from '../controllers/apiClientController.js';

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('apiClientController audit writes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes audit log when secret is regenerated', async () => {
    const ownerId = '507f1f77bcf86cd799439011';
    const client = {
      _id: '507f1f77bcf86cd799439099',
      owner: ownerId,
      clientId: 'cid_test',
      clientSecret: 'old',
      save: jest.fn().mockResolvedValue(undefined),
    };

    ApiClient.findOne.mockResolvedValue(client);
    ApiClient.generateCredentials.mockReturnValue({
      clientId: 'cid_test',
      clientSecret: 'new_secret',
    });

    const req = {
      params: { id: client._id },
      user: { _id: ownerId },
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
    };
    const res = createRes();

    await regenerateSecret(req, res);

    expect(res.json).toHaveBeenCalled();
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'API_CLIENT_SECRET_REGENERATED',
        target: 'api_client',
        targetId: client._id,
      })
    );
  });
});
