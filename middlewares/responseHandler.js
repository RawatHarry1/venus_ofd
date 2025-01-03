const { encryptData } = require('./encryption');
const ResponseConstants = require('../constants/responesConstans');
const responseHandler = {
  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {String} message - Success message
   * @param {Object} data - Response payload (optional)
   * @param {Number} statusCode - HTTP status code (default: 200)
   * @param {Object} req - Express request object
   */
  success: (req, res, message = 'Success', data, statusCode = 200) => {
    const secretKey =
      req.query.secret_key || req.body.secret_key || req.headers.secret_key;

    if (secretKey == 1) {
      return res.status(statusCode).json({
        status: 'success',
        message,
        data: data,
      });
    }
    const encryptedData = encryptData(JSON.stringify(data));
    return res.status(statusCode).json({
      status: 'success',
      message,
      data: encryptedData.data,
    });
  },

  error: (
    res,
    message = 'Something went wrong',
    statusCode = 500,
    error = {},
  ) => {
    res.status(statusCode).json({
      status: 'error',
      message,
      error,
    });
  },

  notFound: (res, message = 'Resource not found') => {
    res.status(404).json({
      status: 'error',
      message,
    });
  },

  unauthorized: (req, res, message = 'Unauthorized access') => {
    res.status(401).json({
      status: 'error',
      message,
    });
  },

  parameterMissingResponse: (res, missingParameter) => {
    const response = {
      error: 'some parameter missing',
      flag: ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING,
      missing_paramter: missingParameter || [],
    };
    res.send(JSON.stringify(response));
  },
};

module.exports = responseHandler;
