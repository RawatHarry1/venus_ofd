const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
} = require('../../bootstart/header');

exports.tokenVailed = async function (token) {
  try {
    let query = `SELECT user_id,created_at, TTL FROM ${dbConstants.ADMIN_AUHT.TOKENS} WHERE token =?`;
    return db.RunQuery(dbConstants.DBS.ADMIN_AUHT, query, [token]);
  } catch (error) {
    return [];
  }
};

exports.isValidOperator = async function (userId) {
  try {
    let query = `SELECT operator_id FROM ${dbConstants.ADMIN_AUHT.ACL_USER} WHERE id =?`;
    return db.RunQuery(dbConstants.DBS.ADMIN_AUHT, query, [userId]);
  } catch (error) {
    return [];
  }
};
