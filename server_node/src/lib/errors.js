export function publicError(code, message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.isPublic = true;
  return error;
}

export function isPublicError(error) {
  return Boolean(error && error.isPublic);
}

export function dbError(message = 'ارتباط با پایگاه داده ممکن نشد.', status = 503) {
  return publicError('DB_ERROR', message, status);
}
