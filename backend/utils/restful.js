/**
 * RESTful Response Utilities
 * Provides consistent response formatting with HATEOAS links
 */

/**
 * Generate HATEOAS links for a resource
 */
export const generateLinks = (baseUrl, resourceId, actions = []) => {
  const links = {
    self: { href: `${baseUrl}/${resourceId}`, method: 'GET' }
  };

  actions.forEach(action => {
    switch (action) {
      case 'update':
        links.update = { href: `${baseUrl}/${resourceId}`, method: 'PUT' };
        links.patch = { href: `${baseUrl}/${resourceId}`, method: 'PATCH' };
        break;
      case 'delete':
        links.delete = { href: `${baseUrl}/${resourceId}`, method: 'DELETE' };
        break;
      case 'list':
        links.list = { href: baseUrl, method: 'GET' };
        break;
      default:
        if (typeof action === 'object') {
          links[action.rel] = { href: action.href, method: action.method || 'GET' };
        }
    }
  });

  return links;
};

/**
 * Format success response with optional HATEOAS links
 */
export const successResponse = (data, message = null, links = null, meta = null) => {
  const response = {
    success: true,
    data,
    ...(message && { message }),
    ...(links && { _links: links }),
    ...(meta && { meta })
  };

  return response;
};

/**
 * Format paginated response with HATEOAS pagination links
 */
export const paginatedResponse = (data, pagination, baseUrl, queryParams = {}) => {
  const { page, limit, total, pages } = pagination;
  
  // Build query string helper
  const buildQuery = (pageNum) => {
    const params = new URLSearchParams({ ...queryParams, page: pageNum, limit });
    return `${baseUrl}?${params.toString()}`;
  };

  // Generate pagination links
  const links = {
    self: { href: buildQuery(page), method: 'GET' },
    first: { href: buildQuery(1), method: 'GET' },
    last: { href: buildQuery(pages), method: 'GET' }
  };

  if (page > 1) {
    links.prev = { href: buildQuery(page - 1), method: 'GET' };
  }

  if (page < pages) {
    links.next = { href: buildQuery(page + 1), method: 'GET' };
  }

  return {
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    },
    _links: links
  };
};

/**
 * Format error response
 */
export const errorResponse = (message, error = null, statusCode = 500) => {
  const response = {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }

  return response;
};

/**
 * Format created resource response with location
 */
export const createdResponse = (data, location, message = 'Resource created successfully') => {
  return {
    success: true,
    message,
    data,
    _links: {
      self: { href: location, method: 'GET' },
      update: { href: location, method: 'PUT' },
      delete: { href: location, method: 'DELETE' }
    }
  };
};

/**
 * Add HATEOAS links to a resource object
 */
export const addResourceLinks = (resource, baseUrl, actions = ['update', 'delete']) => {
  if (!resource) return resource;

  const resourceId = resource._id || resource.id;
  const links = generateLinks(baseUrl, resourceId, actions);

  return {
    ...resource,
    _links: links
  };
};

/**
 * Add HATEOAS links to an array of resources
 */
export const addResourceLinksToArray = (resources, baseUrl, actions = ['update', 'delete']) => {
  return resources.map(resource => addResourceLinks(resource, baseUrl, actions));
};

/**
 * API Versioning helper
 */
export const getApiVersion = (req) => {
  // Check Accept header for version (e.g., application/vnd.jutaghar.v1+json)
  const acceptHeader = req.headers.accept || '';
  const versionMatch = acceptHeader.match(/vnd\.jutaghar\.v(\d+)/);
  
  if (versionMatch) {
    return parseInt(versionMatch[1]);
  }

  // Check custom header
  const versionHeader = req.headers['api-version'];
  if (versionHeader) {
    return parseInt(versionHeader);
  }

  // Default to version 1
  return 1;
};

/**
 * Check if client supports HAL (Hypertext Application Language)
 */
export const supportsHAL = (req) => {
  const acceptHeader = req.headers.accept || '';
  return acceptHeader.includes('application/hal+json');
};

/**
 * Middleware to add API version to request
 */
export const apiVersionMiddleware = (req, res, next) => {
  req.apiVersion = getApiVersion(req);
  next();
};

/**
 * Middleware to add CORS headers for RESTful APIs
 */
export const restfulCorsMiddleware = (req, res, next) => {
  // Allow methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  
  // Expose custom headers
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Per-Page, Link, Location');
  
  next();
};

/**
 * Add standard REST headers to response
 */
export const addRestHeaders = (res, options = {}) => {
  const { location, etag, lastModified, cacheControl } = options;

  if (location) {
    res.header('Location', location);
  }

  if (etag) {
    res.header('ETag', etag);
  }

  if (lastModified) {
    res.header('Last-Modified', lastModified);
  }

  if (cacheControl) {
    res.header('Cache-Control', cacheControl);
  } else {
    res.header('Cache-Control', 'no-cache');
  }

  return res;
};

export default {
  generateLinks,
  successResponse,
  paginatedResponse,
  errorResponse,
  createdResponse,
  addResourceLinks,
  addResourceLinksToArray,
  getApiVersion,
  supportsHAL,
  apiVersionMiddleware,
  restfulCorsMiddleware,
  addRestHeaders
};
