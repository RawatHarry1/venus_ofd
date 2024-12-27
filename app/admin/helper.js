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
