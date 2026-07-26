function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  })
}

function ApiError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

module.exports = { errorHandler, ApiError }
