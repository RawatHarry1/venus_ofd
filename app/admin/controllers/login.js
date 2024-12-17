const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
} = require('../../../bootstart/header');

exports.adminLogin = async (req, res) => {
  try {
    console.log('here now ?');
    /* const { username, password } = req.body;
        if (!username || !password) return responseHandler.error(req, res, 'Username and password are required', 400); */

    // Parameterized query to prevent SQL injection
    /* const query = `SELECT * FROM ${dbConstants.tables.ACL_USER} WHERE username = ? AND password = ?`;
        const [user] = await db.RunQuery('venus_acl', query, [username, password]); */

    const query = `SELECT * FROM ${dbConstants.ADMIN_AUHT.ACL_USER}`;
    const users = await db.RunQuery('venus_acl', query, []);

    // No user found or invalid credentials
    if (!users)
      return responseHandler.error(
        req,
        res,
        'Invalid username or password',
        401,
      );

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
    errorHandler.errorHandler(err, req, res);
  }
};

exports.loginUsingToken = async function (req, res) {
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
};
