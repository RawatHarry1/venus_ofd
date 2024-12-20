const fs = require('fs');
const path = require('path');

// Global error handler
exports.errorHandler = async (err, req, res, next) => {
  // Log the error to a file
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: err.message || 'Internal Server Error',
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  };

  const logFilePath = path.join(__dirname, '..', 'logs', 'error.log');

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(path.dirname(logFilePath))) {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  }

  // Log the error to a file
  fs.appendFileSync(logFilePath, JSON.stringify(errorLog) + '\n', 'utf8');

  // Respond to the client with a generic message
 return  res.status(500).json({
    message: 'An unexpected error occurred. Please try again later.',
  });
};
