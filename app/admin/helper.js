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
    let query = `SELECT operator_id FROM ${dbConstants.ADMIN_AUTH.ACL_USER} WHERE id =?`;
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
    const result = await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, query, [token]);

    // If the token is unique, return it
    if (result.length === 0) {
      return token;
    }
  }
};
