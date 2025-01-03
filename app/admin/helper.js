const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  rideConstants,
} = require('../../bootstart/header');
const crypto = require('crypto');

exports.tokenVailed = async function (token) {
  try {
    let query = `SELECT user_id,created_at, TTL FROM ${dbConstants.ADMIN_AUTH.TOKENS} WHERE token =?`;
    return db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, [token]);
  } catch (error) {
    return [];
  }
};

exports.isValidOperator = async function (userId) {
  try {
    let query = `SELECT id, name, email, operator_id, city,fleet_id FROM ${dbConstants.ADMIN_AUTH.ACL_USER} WHERE id =?`;
    return db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, [userId]);
  } catch (error) {
    return [];
  }
};

exports.getTokenString = async () => {
  while (true) {
    // Generate a 32-byte hexadecimal token
    const token = crypto.pseudoRandomBytes(32).toString('hex');

    // Query to check if the token already exists
    const query = `
      SELECT id FROM ${dbConstants.ADMIN_AUTH.TOKENS} WHERE token = ?`;
    const result = await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, [
      token,
    ]);

    // If the token is unique, return it
    if (result.length === 0) {
      return token;
    }
  }
};

exports.verifyPermissions = async (
  granted_permissions,
  required_permissions,
) => {
  if (Object.keys(required_permissions).length === 0) {
    return true;
  }
  var flag = false;

  granted_permissions &&
    granted_permissions.forEach(function (granted_permission) {
      required_permissions &&
        required_permissions.forEach(function (required_permission) {
          if (
            (granted_permission.panel_id === 0 ||
              granted_permission.panel_id === required_permission.panel_id) &&
            (required_permission.level_id.indexOf(constants.level.ALL) != -1 ||
              granted_permission.level_id === 0 ||
              required_permission.level_id.indexOf(
                granted_permission.level_id,
              ) != -1) &&
            (required_permission.city_id === constants.cities.ALL ||
              granted_permission.city_id == 0 ||
              required_permission.city_id == 'null' ||
              granted_permission.city_id
                .toString()
                .split(',')
                .indexOf(required_permission.city_id.toString()) > -1)
          ) {
            flag = true;
            return;
          }
        });
    });
  return flag;
};

exports.getVehicle = async (cityId, operatorId, vehicleType, regionId) => {
  var whereClause = [],
    values = [];
  if (cityId) {
    whereClause.push('city_id = ?');
    values.push(cityId);
  }
  if (operatorId) {
    whereClause.push('operator_id = ? ');
    values.push(operatorId);
  }
  if (vehicleType) {
    whereClause.push('vehicle_type = ? ');
    values.push(vehicleType);
  }
  if (regionId) {
    whereClause.push('region_id = ? ');
    values.push(regionId);
  }

  whereClause.push('is_active = ?');
  values.push(1);

  if (whereClause.length) {
    whereClause = 'WHERE ' + whereClause.join(' AND ');
  } else {
    whereClause = '';
  }

  var stmt = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} ${whereClause}`;
  const vehicle = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, values);
  return vehicle;
};

exports.makeDataForVehicles = (vehicleDetails) => {
  var cityWiseVehicles = {
    0: [],
  };

  for (var i in vehicleDetails) {
    var vehicle = {};
    vehicle['vehicle_type'] = vehicleDetails[i].vehicle_type;
    vehicle['vehicle_name'] = vehicleDetails[i].region_name;

    var index = cityWiseVehicles[0].findIndex(
      (x) => x.vehicle_type == vehicle['vehicle_type'],
    );
    if (index == -1) {
      var len = cityWiseVehicles[0].push(vehicle);
      index = len - 1;
      cityWiseVehicles[0][index].ride_types = new Set();
    }
    cityWiseVehicles[0][index].ride_types.add(vehicleDetails[i].ride_type);
    if (cityWiseVehicles[vehicleDetails[i].city_id]) {
      cityWiseVehicles[vehicleDetails[i].city_id];

      var index = cityWiseVehicles[vehicleDetails[i].city_id].findIndex(
        (x) => x.vehicle_type == vehicle['vehicle_type'],
      );
      if (index == -1)
        cityWiseVehicles[vehicleDetails[i].city_id].push(vehicle);
    } else cityWiseVehicles[vehicleDetails[i].city_id] = [vehicle];
  }

  for (var vehicle of cityWiseVehicles[0]) {
    vehicle.ride_types = [...new Set(vehicle.ride_types)];
  }
  return cityWiseVehicles;
};

exports.getOperatorParameters = async (
  paramNames,
  operatorId,
  resultWrapper,
) => {
  var getParameters = `SELECT pr.param_name,COALESCE(opr.param_value, pr.param_value) AS param_value FROM ${dbConstants.DBS.LIVE_DB}.tb_parameters pr LEFT JOIN ${dbConstants.DBS.LIVE_DB}.tb_operator_params opr ON pr.param_id = opr.param_id AND opr.operator_id = ? WHERE pr.param_name IN (?)`;

  var values = [operatorId, paramNames];
  const parameters = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    getParameters,
    values,
  );
  for (var i = 0; i < parameters.length; i++) {
    resultWrapper[parameters[i].param_name] = parameters[i].param_value;
  }
};

exports.sqlQueryForAutos = async (
  req,
  keyType,
  userId,
  operatorId,
  userFound,
) => {
  try {
    let stmt = `SELECT u.user_id
                FROM ${dbConstants.DBS.LIVE_DB}.tb_users u
                WHERE u.operator_id = ? and `;

    // Constructing query based on keyType
    switch (keyType) {
      case rideConstants.USER_DETAIL_SEARCH_KEY.USER_ID:
        stmt += ' u.user_id = ?';
        break;
      case rideConstants.USER_DETAIL_SEARCH_KEY.USER_EMAIL:
        stmt += ' u.user_email = ?';
        break;
      case rideConstants.USER_DETAIL_SEARCH_KEY.USER_PHONE:
        stmt += ' u.phone_no = ?';
        if (!req.body.country_code) {
          userId = '+91' + userId.slice(-10);
        }
        break;
    }

    // Execute query
    const userInfo = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, [
      operatorId,
      userId,
    ]);

    // Check if user exists in the ecosystem
    if (userInfo.length === 0) {
      userFound.isAutosUser = 0;
    } else {
      req.body.user_id = userInfo[0].user_id;
      userFound.isAutosUser = 1;
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.sqlQueryForVendors = async (
  req,
  keyType,
  userId,
  operatorId,
  userFound,
) => {
  if (operatorId != 1) {
    userFound.isVendor = 0;
    return;
  }
  try {
    let stmt = `SELECT a.user_id ,a.verification_status FROM ${dbConstants.DBS.AUTH_DB}.tb_users AS a JOIN  ${dbConstants.DBS.AUTH_DB}.tb_users_delivery AS b ON a.user_id = b.user_id WHERE`;

    switch (keyType) {
      case rideConstants.USER_DETAIL_SEARCH_KEY.USER_ID:
        stmt += ' a.venus_autos_user_id = ?';
        break;
      case rideConstants.USER_DETAIL_SEARCH_KEY.USER_EMAIL:
        stmt += ' a.user_email = ?';
        req.body.email = userId;
        break;
      case rideConstants.USER_DETAIL_SEARCH_KEY.USER_PHONE:
        stmt += ' a.phone_no = ?';
        userId = '+91' + userId.slice(-10);
        req.body.phoneNo = userId;
        break;
    }

    // Execute query
    const vendorInfo = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, [
      userId,
    ]);
    if (vendorInfo.length == 0) {
      userFound.isVendor = 0;
    } else {
      userFound.isVendor = 1;
      userFound.verificationStatus = vendorInfo[0].verification_status;
      req.body.authUserId = vendorInfo[0].user_id;
      if (keyType == 0) {
        req.body.userId = vendorInfo[0].user_id;
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
};
