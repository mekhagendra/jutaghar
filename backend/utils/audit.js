import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';
import logger from './logger.js';

const resolveIp = (req) => {
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || '';
};

export const writeAudit = async ({ req, action, target, targetId, metadata = {}, actor } = {}) => {
  try {
    // In test/unit contexts without a DB connection, skip quickly to avoid buffering delays.
    if (mongoose.connection.readyState === 0) {
      return;
    }

    const resolvedActor = actor || String(req?.user?._id || 'system');
    const resolvedTarget = target || 'unknown';

    await AuditLog.create({
      actor: resolvedActor,
      action,
      target: resolvedTarget,
      targetId: targetId || undefined,
      ip: resolveIp(req),
      userAgent: req?.headers?.['user-agent'] || '',
      metadata,
    });
  } catch (error) {
    logger.warn({ err: error, action }, 'Audit log write failed');
  }
};
