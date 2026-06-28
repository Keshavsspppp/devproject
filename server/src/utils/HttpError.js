export class HttpError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
  static badRequest(msg = 'Bad request', details) {
    return new HttpError(400, msg, details);
  }
  static unauthorized(msg = 'Unauthorized') {
    return new HttpError(401, msg);
  }
  static forbidden(msg = 'Forbidden') {
    return new HttpError(403, msg);
  }
  static notFound(msg = 'Not found') {
    return new HttpError(404, msg);
  }
  static conflict(msg = 'Conflict') {
    return new HttpError(409, msg);
  }
}
