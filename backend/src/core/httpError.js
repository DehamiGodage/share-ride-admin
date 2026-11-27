// Throw this from any controller. The error handler in app.js turns it into:
//   { error: { code, message, details } }   with the given HTTP status
//
//   throw httpError(404, 'NOT_FOUND', 'User not found');
function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

export { httpError };
