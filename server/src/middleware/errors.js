import { HttpError } from '../utils/HttpError.js';

export function notFound(_req, _res, next) {
  next(HttpError.notFound('Resource not found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err?.status || 500;
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({
    error: err?.message || 'Internal server error',
    ...(err?.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}),
  });
}

/** Convert zod validation errors into 400s. */
export function zodError(zErr) {
  return HttpError.badRequest(
    'Validation failed',
    zErr.errors || zErr.issues || zErr.message
  );
}
