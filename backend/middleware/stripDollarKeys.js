import { stripOperators } from '../utils/sanitizeInput.js';

export const stripDollarKeys = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    stripOperators(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    stripOperators(req.query);
  }
  next();
};
