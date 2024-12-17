const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('../db/connection');

const { errorHandler } = require('../middlewares/errorHandler');

const routes = require('./routes');
const requestLogger = require('./logging');

const { verifyDbConnections } = require('../db/connectionHealth');

const adminRoutes = require('../app/admin');

module.exports = async function (app) {
  app.use(helmet());

  app.use(cors());

  app.use(morgan('dev'));

  app.use(requestLogger);
  const dbStatus = await verifyDbConnections();
  dbStatus.forEach(({ dbName, status, error }) => {
    if (status === 'Failed') {
      console.error(`Database connection failed for ${dbName}: ${error}`);
    } else {
      console.log(`Database connection established for ${dbName}`);
    }
  });
  if (dbStatus.some((db) => db.status === 'Failed')) {
    console.error('Exiting due to failed database connections.');
    process.exit(1);
  }
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again later.',
    handler: (req, res, next) => {
      res.status(429).json({
        status: 'error',
        message: 'Too many requests from this IP, please try again later.',
      });
    },
  });
  app.use(limiter);
  app.use(express.json());

  app.use('/api', routes);

  /**
   * Loading routes
   */
  adminRoutes(app);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  app.delete('/clean-logs', (req, res) => {
    exec('../clean_logs.sh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error.message}`);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to clean logs.',
          error: error.message,
        });
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({
          status: 'error',
          message: 'Error cleaning logs.',
          error: stderr,
        });
      }
      console.log(`stdout: ${stdout}`);
      return res.status(200).json({
        status: 'success',
        message: 'Logs cleaned successfully.',
      });
    });
  });

  app.use(errorHandler);
  app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ message: err.message });
  });
};
