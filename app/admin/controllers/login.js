const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants
} = require('../../../bootstart/header');
const Helper = require('../helper');

exports.adminLogin = async (req, res) => {
  try {
    console.log('here now ?');
    const { email, password, TTL, is_delivery_panel } = req.body;

    if (!email || !password) {
      return responseHandler.error(req, res, 'Email and password are required', ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING);
    }

    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
    const isDeliveryPanel = Number(is_delivery_panel) || 0;

    const query = `SELECT password, status, id, is_infinite_TTL, oath_taken, operator_id, name, access_menu FROM ${dbConstants.ADMIN_AUTH.ACL_USER} WHERE email = ?`;

    const [userDetails] = await db.RunQuery('venus_acl', query, [email]);

        // Check if user exists
        if (!userDetails) {
          return responseHandler.error(req, res, 'Invalid email or password', 401);
        }

            // Check if user is active
    if (userDetails.status !== 'ACTIVE') {
      return responseHandler.error(req, res, 'User is INACTIVE, please verify with Admin', 403);
    }

        // Generate token
        const tokenData = {
          user_id: userDetails.id,
          is_infinite_TTL: userDetails.is_infinite_TTL,
          TTL: TTL || null,
        };
        Helper.getTokenString
        const token = await tokens.createToken(tokenData);


            // Check if password matches
    if (userDetails.password !== hashedPassword) {
      return responseHandler.error(req, res, 'Invalid email or password', 401);
    }


    // Return success with the found user
    return responseHandler.success(req, res, 'Login successful', users);
  } catch (err) {
    errorHandler.errorHandler(err, req, res);
  }
};

exports.checkOperatorToken = async function (req, res) {
  try {
    if (!req.body.domain) {
      return responseHandler.parameterMissingResponse(res, ['domain']);
    }
    let enabled_service;
    const query = `SELECT is_delivery_enabled, is_taxi_enabled, token FROM ${dbConstants.LIVE_DB.OPERATPRS} WHERE domain = ?`;
    var values = [req.body.domain];
    var data = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);
    if (data.length > 0) {
      const { is_taxi_enabled, is_delivery_enabled } = data[0];
      if (is_taxi_enabled && is_delivery_enabled) {
        enabled_service = 3;
      } else if (is_taxi_enabled) {
        enabled_service = 1;
      } else if (is_delivery_enabled) {
        enabled_service = 2;
      } else {
        enabled_service = 0;
      }
      delete data[0].is_delivery_enabled;
      delete data[0].is_taxi_enabled;
      data[0].enabled_service = enabled_service;
    }

    return responseHandler.success(req, res, '', data);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.loginUsingToken = async function (req, res) {
  try {
    var response = {};
    const query = `SELECT status,id,operator_id,name,access_menu,email  FROM ${dbConstants.ADMIN_AUHT.ACL_USER} WHERE id = ?`;
    var values = [req.user_id];
    let uerData = await db.RunQuery(dbConstants.DBS.ADMIN_AUHT, query, values);
    response.access_menu = JSON.parse(uerData[0].access_menu);
    response.email = uerData[0].email;
    response.name = uerData[0].name;
    response.operator_id = req.operator_id;
    response.vehicles = [];
    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
