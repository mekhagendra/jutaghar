import ApiClient from '../models/ApiClient.js';
import User from '../models/User.js';
import { writeAudit } from '../utils/audit.js';
import { asNumber, asObjectId, asString, stripOperators } from '../utils/sanitizeInput.js';

// Create API client
export const createApiClient = async (req, res) => {
  try {
    const { name, description, scopes, rateLimitTier, allowedIPs, allowedOrigins, expiresInDays } = req.body;

    // Generate credentials
    const { clientId, clientSecret } = ApiClient.generateCredentials();

    // Calculate expiration
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const apiClient = new ApiClient({
      name,
      description,
      clientId,
      clientSecret, // Will be hashed by pre-save hook
      owner: req.user._id,
      scopes: scopes || ['read:products', 'read:orders'],
      rateLimitTier: rateLimitTier || 'basic',
      allowedIPs: allowedIPs || [],
      allowedOrigins: allowedOrigins || [],
      expiresAt
    });

    await apiClient.save();

    await writeAudit({
      req,
      action: 'API_CLIENT_CREATED',
      target: 'api_client',
      targetId: apiClient._id,
      metadata: {
        ownerId: String(apiClient.owner),
        scopes: apiClient.scopes,
        status: apiClient.status,
      },
    });

    // Return the plain secret only once (won't be retrievable later)
    res.status(201).json({
      success: true,
      message: 'API client created successfully. Save the client secret - it won\'t be shown again.',
      data: {
        id: apiClient._id,
        name: apiClient.name,
        clientId,
        clientSecret, // Plain text - only shown at creation
        scopes: apiClient.scopes,
        rateLimitTier: apiClient.rateLimitTier,
        status: apiClient.status,
        createdAt: apiClient.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create API client',
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get all API clients for current user
export const getMyApiClients = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const status = safeQuery.status ? asString(safeQuery.status) : '';
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 10)));

    const query = { owner: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const apiClients = await ApiClient.find(query)
      .select('-clientSecret')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ApiClient.countDocuments(query);

    res.json({
      success: true,
      data: apiClients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API clients',
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get API client by ID
export const getApiClientById = async (req, res) => {
  try {
    const clientId = asObjectId(req.params.id);
    const apiClient = await ApiClient.findOne({
      _id: clientId,
      owner: req.user._id
    }).select('-clientSecret');

    if (!apiClient) {
      return res.status(404).json({
        success: false,
        message: 'API client not found'
      });
    }

    res.json({
      success: true,
      data: apiClient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API client',
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update API client
export const updateApiClient = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const { name, description, scopes, rateLimitTier, allowedIPs, allowedOrigins, status } = sanitizedBody;
    const clientId = asObjectId(req.params.id);

    const apiClient = await ApiClient.findOne({
      _id: clientId,
      owner: req.user._id
    });

    if (!apiClient) {
      return res.status(404).json({
        success: false,
        message: 'API client not found'
      });
    }

    if (name) apiClient.name = name;
    if (description !== undefined) apiClient.description = description;
    if (scopes) apiClient.scopes = scopes;
    if (rateLimitTier) apiClient.rateLimitTier = rateLimitTier;
    if (allowedIPs) apiClient.allowedIPs = allowedIPs;
    if (allowedOrigins) apiClient.allowedOrigins = allowedOrigins;
    if (status) apiClient.status = status;

    await apiClient.save();

    res.json({
      success: true,
      message: 'API client updated successfully',
      data: apiClient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update API client',
      message: 'Internal error', requestId: req.id
    });
  }
};

// Regenerate client secret
export const regenerateSecret = async (req, res) => {
  try {
    const clientId = asObjectId(req.params.id);
    const apiClient = await ApiClient.findOne({
      _id: clientId,
      owner: req.user._id
    });

    if (!apiClient) {
      return res.status(404).json({
        success: false,
        message: 'API client not found'
      });
    }

    const { clientSecret } = ApiClient.generateCredentials();
    apiClient.clientSecret = clientSecret;
    await apiClient.save();

    await writeAudit({
      req,
      action: 'API_CLIENT_SECRET_REGENERATED',
      target: 'api_client',
      targetId: apiClient._id,
      metadata: {
        ownerId: String(apiClient.owner),
        clientId: apiClient.clientId,
      },
    });

    res.json({
      success: true,
      message: 'Client secret regenerated successfully. Save it - it won\'t be shown again.',
      data: {
        clientId: apiClient.clientId,
        clientSecret // Plain text - only shown at regeneration
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate secret',
      message: 'Internal error', requestId: req.id
    });
  }
};

// Delete API client
export const deleteApiClient = async (req, res) => {
  try {
    const clientId = asObjectId(req.params.id);
    const apiClient = await ApiClient.findOneAndDelete({
      _id: clientId,
      owner: req.user._id
    });

    if (!apiClient) {
      return res.status(404).json({
        success: false,
        message: 'API client not found'
      });
    }

    await writeAudit({
      req,
      action: 'API_CLIENT_DELETED',
      target: 'api_client',
      targetId: apiClient._id,
      metadata: {
        ownerId: String(apiClient.owner),
        clientId: apiClient.clientId,
      },
    });

    res.json({
      success: true,
      message: 'API client deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete API client',
      message: 'Internal error', requestId: req.id
    });
  }
};

// Admin: Get all API clients
export const getAllApiClients = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const status = safeQuery.status ? asString(safeQuery.status) : '';
    const owner = safeQuery.owner ? asString(safeQuery.owner) : '';
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 20)));

    const query = {};
    if (status) query.status = status;
    if (owner) query.owner = asObjectId(owner);

    const skip = (page - 1) * limit;

    const apiClients = await ApiClient.find(query)
      .select('-clientSecret')
      .populate('owner', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ApiClient.countDocuments(query);

    res.json({
      success: true,
      data: apiClients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API clients',
      message: 'Internal error', requestId: req.id
    });
  }
};

// Admin: Revoke API client
export const revokeApiClient = async (req, res) => {
  try {
    const clientId = asObjectId(req.params.id);
    const apiClient = await ApiClient.findById(clientId);

    if (!apiClient) {
      return res.status(404).json({
        success: false,
        message: 'API client not found'
      });
    }

    apiClient.status = 'revoked';
    await apiClient.save();

    await writeAudit({
      req,
      action: 'API_CLIENT_REVOKED',
      target: 'api_client',
      targetId: apiClient._id,
      metadata: {
        ownerId: String(apiClient.owner),
        clientId: apiClient.clientId,
      },
    });

    res.json({
      success: true,
      message: 'API client revoked successfully',
      data: apiClient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API client',
      message: 'Internal error', requestId: req.id
    });
  }
};
