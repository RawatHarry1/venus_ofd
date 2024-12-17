// bootstart/logging.js
const logger = require('./logger');

function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log the incoming request
  logger.info(
    `Incoming Request: ${req.method} ${req.url} - ${JSON.stringify(req.body)}`,
  );

  // Capture the response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`Response: ${res.statusCode} - ${duration}ms`);
  });

  next();
}

module.exports = requestLogger;
