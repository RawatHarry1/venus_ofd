const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  authConstants,
} = require('../../../bootstart/header');
const Helper = require('../helper');
const crypto = require('crypto');
const GeneralConstant = require('../../../constants/general');

exports.adminLogin = async (req, res) => {
  try {
    console.log('here now ?');
    const { email, password, TTL, is_delivery_panel } = req.body;
    var paramsWrapper = {};

    if (!email || !password) {
      return responseHandler.error(
        req,
        res,
        'Email and password are required',
        ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING,
      );
    }

    const hashedPassword = crypto
      .createHash('md5')
      .update(password)
      .digest('hex');
    const isDeliveryPanel = Number(is_delivery_panel) || 0;

    var data = {
      email: email,
      password: hashedPassword,
      is_delivery_panel: isDeliveryPanel,
      is_login: 1,
    };

    const query = `SELECT password, status, id, is_infinite_TTL, oath_taken, operator_id, name, access_menu FROM ${dbConstants.ADMIN_AUTH.ACL_USER} WHERE email = ?`;

    const [userDetails] = await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, [
      email,
    ]);

    // Check if user exists
    if (!userDetails) {
      return responseHandler.error(req, res, 'Invalid email or password', 401);
    }

    // Check if password matches
    if (userDetails.password !== hashedPassword) {
      return responseHandler.error(req, res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (userDetails.status !== 'ACTIVE') {
      return responseHandler.error(
        res,
        'User is INACTIVE, please verify with Admin',
        403,
      );
    }

    // Generate token
    const tokenData = {
      user_id: userDetails.id,
      is_infinite_TTL: userDetails.is_infinite_TTL,
      TTL: TTL || null,
    };
    const token = await createToken(tokenData);
    let stmt = `SELECT operator_id FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATPRS} WHERE token = ? `;
    let values = [req.headers.domain_token];
    let operatorId = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, values);

    var vehicleDetails = await Helper.getVehicle(0, operatorId[0].operator_id);
    var finalVehicleList = Helper.makeDataForVehicles(vehicleDetails);
    let google_key_name = 'google_api_key';

    await Helper.getOperatorParameters(
      google_key_name,
      operatorId[0].operator_id,
      paramsWrapper,
    );

    data.user_name = userDetails.name;
    data.user_id = userDetails.id || 0;
    data.token = token;
    data.TTL = TTL;
    data.access_menu = JSON.parse(userDetails.access_menu);
    (data.google_key = paramsWrapper.google_api_key || ''),
      (data.vehicles = finalVehicleList);
    delete data.password;

    return responseHandler.success(req, res, 'Login successful', data);
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
    var paramsWrapper = {};
    const query = `SELECT status,id,operator_id,name,access_menu,email  FROM ${dbConstants.ADMIN_AUTH.ACL_USER} WHERE id = ?`;
    var values = [req.user_id];
    let uerData = await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, values);
    response.access_menu = JSON.parse(uerData[0].access_menu);
    let stmt = `SELECT operator_id FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATPRS} WHERE token = ? `;
    var values = [req.headers.domain_token];
    let operatorId = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, values);

    var vehicleDetails = await Helper.getVehicle(0, operatorId[0].operator_id);
    var finalVehicleList = Helper.makeDataForVehicles(vehicleDetails);
    let google_key_name = 'google_api_key';

    await Helper.getOperatorParameters(
      google_key_name,
      operatorId[0].operator_id,
      paramsWrapper,
    );

    response.user_id = req.user_id || 0;

    response.email = uerData[0].email;
    response.name = uerData[0].name;
    response.operator_id = req.operator_id;
    (response.google_key = paramsWrapper.google_api_key || ''),
      (response.vehicles = finalVehicleList);
    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

const createToken = async (data) => {
  const { user_id, is_infinite_TTL } = data;

  if (!user_id) {
    throw new Error('User ID is required!');
  }

  const TTL = is_infinite_TTL
    ? authConstants.AUTH_CONSTANTS.infinite_TTL
    : authConstants.AUTH_CONSTANTS.default_TTL;

  const token = await Helper.getTokenString();
  const query = `
    INSERT INTO ${dbConstants.ADMIN_AUTH.TOKENS} (user_id, token, TTL)
    VALUES (?, ?, ?)
  `;
  await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, [user_id, token, TTL]);
  return token;
};

exports.getAdminDetails = async function (req, res) {
  var response = {};
  try {
    let isDeliveryPanel = Number(req.query.is_delivery_panel);
    let panelId = GeneralConstant.PANELS.SUPER_ADMIN_PANEL;
    if (isDeliveryPanel) {
      panelId = GeneralConstant.PANELS.SUPER_ADMIN_surya_PANEL;
    }

    const query = `SELECT name,
    email,id as user_id,
    email,created_at,status
    FROM ${dbConstants.ADMIN_AUTH.ACL_USER} WHERE operator_id = ?`;
    var values = [req.operator_id];
    let uerData = await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, values);
    return responseHandler.success(req, res, '', uerData);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.addAdmin = async function (req, res) {
  var response = {};
  try {
    if (!req.body.email || !req.body.password || !req.body.name) {
      return responseHandler.parameterMissingResponse(res, [
        'email',
        'password',
        'name',
      ]);
    }
    const { email, password, city, name, phone_number, status } = req.body;
    const hashedPassword = crypto
      .createHash('md5')
      .update(password)
      .digest('hex');

    // Check if user already exists
    const query = `SELECT id FROM ${dbConstants.ADMIN_AUTH.ACL_USER} WHERE email = ?`;
    const [existingUser] = await db.RunQuery(
      dbConstants.DBS.ADMIN_AUTH,
      query,
      [email],
    );
    if (existingUser) {
      return responseHandler.error(res, 'User already exists', 409);
    }

    const insertQuery = `INSERT INTO ${dbConstants.ADMIN_AUTH.ACL_USER} (email, password, name, city, phone_number, status,operator_id) VALUES (?,?,?,?,?,?,?)`;
    const values = [
      email,
      hashedPassword,
      name,
      city,
      phone_number,
      status,
      req.operator_id,
    ];
    await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, insertQuery, values);

    return responseHandler.success(
      req,
      res,
      'User added successfully',
      response,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
exports.updateAdmin = async function (req, res) {
  var response = {};
  try {
    if (!req.body.email || !req.body.name) {
      return responseHandler.parameterMissingResponse(res, ['email', 'name']);
    }

    const { email, name } = req.body;
    const query = `UPDATE ${dbConstants.ADMIN_AUTH.ACL_USER} SET name = ? WHERE email = ?`;
    const values = [name, email];
    await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, values);

    return responseHandler.success(
      req,
      res,
      'User Updated successfully',
      response,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.suspendAdmin = async function (req, res) {
  var response = {};
  try {
    if (!req.body.user_id) {
      return responseHandler.parameterMissingResponse(res, ['user_id']);
    }

    const { user_id } = req.body;
    const query = `UPDATE ${dbConstants.ADMIN_AUTH.ACL_USER} SET status = 'INACTIVE' WHERE id = ?`;
    const values = [user_id];
    await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, values);

    return responseHandler.success(
      req,
      res,
      'User Updated successfully',
      response,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.getPageWithPermission = async function (req, res) {
  try {
    if (!req.body.admin_id) {
      return responseHandler.parameterMissingResponse(res, ['admin_id']);
    }

    const { admin_id } = req.body;
    var query = `SELECT access_menu FROM ${dbConstants.DBS.ADMIN_AUTH}.${dbConstants.ADMIN_AUTH.ACL_USER} WHERE id = ?`;
    var values = [admin_id];
    var [userData] = await db.RunQuery(
      dbConstants.DBS.ADMIN_AUTH,
      query,
      values,
    );
    var query = `SELECT * FROM ${dbConstants.DBS.ADMIN_AUTH}.${dbConstants.ADMIN_AUTH.ACL_ACCESS_MENUS} WHERE status = 1`;
    var values = [admin_id];
    const master_menu_obj = await db.RunQuery(
      dbConstants.DBS.ADMIN_AUTH,
      query,
      [],
    );

    if (userData.access_menu != undefined) {
      var _master_menu_obj = Helper.unflatten(
        master_menu_obj,
        userData.access_menu,
      );
    } else {
      var _master_menu_obj = Helper.unflatten(master_menu_obj, new Object());
    }

    return responseHandler.success(req, res, '', _master_menu_obj);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.editAdmin = async function (req, res) {
  var response = {};
  try {
    if (!req.body.email || !req.body.name) {
      return responseHandler.parameterMissingResponse(res, ['email', 'name']);
    }

    const { email, name, id } = req.body;
    const query = `UPDATE ${dbConstants.ADMIN_AUTH.ACL_USER} SET name = ?,email = ?  WHERE id = ?`;
    const values = [name, email, id];
    await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, values);

    return responseHandler.success(
      req,
      res,
      'User Updated successfully',
      response,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.update_permission = async function (req, res) {
  try {
    var adminId = req.body.admin_id;
    var accessMenu = req.body.access_menu;
    var note = req.body.note;
    if (!adminId || !accessMenu || !note) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    accessMenu = JSON.stringify(accessMenu);
    const query = `UPDATE ${dbConstants.DBS.ADMIN_AUTH}.${dbConstants.ADMIN_AUTH.ACL_USER} SET access_menu = ?, note = ? WHERE id = ?`;
    const values = [accessMenu, note, adminId];
    await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, values);

    return responseHandler.success(
      req,
      res,
      'Permission Updated successfully',
      {},
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
