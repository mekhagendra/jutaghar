import { stripOperators } from '../utils/sanitizeInput.js';

export const stripDollarKeys = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    stripOperators(req.body);
  }
  next();
};
