const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
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

exports.verifyPermissions = async (granted_permissions, required_permissions) => {

  if (Object.keys(required_permissions).length === 0) {
    return true;
  }
  var flag = false;

  granted_permissions && granted_permissions.forEach(function (granted_permission) {
    required_permissions && required_permissions.forEach(function (required_permission) {

      if (
        (granted_permission.panel_id === 0 || granted_permission.panel_id === required_permission.panel_id) &&
        (required_permission.level_id.indexOf(constants.level.ALL) != -1 || granted_permission.level_id === 0 || required_permission.level_id.indexOf(granted_permission.level_id) != -1) &&
        (required_permission.city_id === constants.cities.ALL || granted_permission.city_id == 0 || required_permission.city_id == 'null' ||
          granted_permission.city_id.toString().split(",").indexOf(required_permission.city_id.toString()) > -1)) {
        flag = true;
        return;
      }
    });
  });
  return flag;
}

exports.getVehicle = async (cityId, operatorId, vehicleType, regionId) => {
  var whereClause = [], values = [];
  if (cityId) {
    whereClause.push("city_id = ?");
    values.push(cityId);
  }
  if (operatorId) {
    whereClause.push("operator_id = ? ");
    values.push(operatorId);
  }
  if (vehicleType) {
    whereClause.push("vehicle_type = ? ");
    values.push(vehicleType);
  }
  if (regionId) {
    whereClause.push("region_id = ? ");
    values.push(regionId);
  }

  whereClause.push("is_active = ?")
  values.push(1);

  if (whereClause.length) {
    whereClause = "WHERE " + whereClause.join(" AND ");
  } else {
    whereClause = "";
  }

  var stmt = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} ${whereClause}`;
  const vehicle = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, values);
  return vehicle;
}

exports.makeDataForVehicles = (vehicleDetails) => {
  var cityWiseVehicles = {
    0: []
  };

  for (var i in vehicleDetails) {
    var vehicle = {};
    vehicle['vehicle_type'] = vehicleDetails[i].vehicle_type;
    vehicle['vehicle_name'] = vehicleDetails[i].region_name;

    var index = cityWiseVehicles[0].findIndex(x => x.vehicle_type == vehicle['vehicle_type']);
    if (index == -1) {
      var len = cityWiseVehicles[0].push(vehicle);
      index = len - 1;
      cityWiseVehicles[0][index].ride_types = new Set();
    }
    cityWiseVehicles[0][index].ride_types.add(vehicleDetails[i].ride_type);
    if (cityWiseVehicles[vehicleDetails[i].city_id]) {

      cityWiseVehicles[vehicleDetails[i].city_id]

      var index = cityWiseVehicles[vehicleDetails[i].city_id].findIndex(x => x.vehicle_type == vehicle['vehicle_type']);
      if (index == -1)
        cityWiseVehicles[vehicleDetails[i].city_id].push(vehicle);

    }
    else
      cityWiseVehicles[vehicleDetails[i].city_id] = [vehicle];
  }

  for (var vehicle of cityWiseVehicles[0]) {
    vehicle.ride_types = [...new Set(vehicle.ride_types)];
  }
  return cityWiseVehicles;
}

exports.getOperatorParameters = async (paramNames, operatorId, resultWrapper) => {
  var getParameters = `SELECT pr.param_name,COALESCE(opr.param_value, pr.param_value) AS param_value FROM tb_parameters pr LEFT JOIN tb_operator_params opr ON pr.param_id = opr.param_id AND opr.operator_id = ? WHERE pr.param_name IN (?)`;

  var values = [operatorId, paramNames];
  const parameters = await db.RunQuery(dbConstants.DBS.LIVE_DB, getParameters, values);
  for (var i = 0; i < parameters.length; i++) {
    resultWrapper[parameters[i].param_name] = parameters[i].param_value;
  }
}