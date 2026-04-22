import { randomUUID } from 'crypto';

/**
 * Attaches a unique request ID to every request and echoes it back as a
 * response header so callers can correlate client-visible errors with
 * server-side log entries.
 */
export const requestId = (req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
