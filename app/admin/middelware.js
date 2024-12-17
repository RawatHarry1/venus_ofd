const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
} = require('../../bootstart/header');
const Helper = require('./helper');
exports.admin = {
  isLoggedIn: async function (req, res, next) {
    var token = req.query.token || req.body.token || req.cookies.token;
    let isLoginIn = await Helper.tokenVailed(token);
    if (isLoginIn) {
      req.user_id = isLoginIn[0].user_id;
      let validOpertor = await Helper.isValidOperator(isLoginIn[0].user_id);
      req.operator_id = validOpertor[0].operator_id;
      next();
    } else {
      responseHandler.unauthorized(req, res);
      next();
    }
  },
  domainToken: async function (req, res, next) {
    try {
      const token =
        (req.cookies && req.cookies.token) || req.body.token || req.query.token;
      const domainToken =
        (req.cookies && req.cookies.domain_token) ||
        req.headers.domain_token ||
        req.body.domain_token ||
        req.query.domain_token;

      if (!token || !domainToken) {
        return responseHandler.unauthorized(req, res);
      }
      const sqlQuery = `
        SELECT 
            tbo.token 
        FROM 
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATPRS} tbo
        INNER JOIN
            ${dbConstants.DBS.ADMIN_AUHT}.${dbConstants.ADMIN_AUHT.ACL_USER} tau
        ON
            tbo.operator_id = tau.operator_id
        INNER JOIN
            ${dbConstants.DBS.ADMIN_AUHT}.${dbConstants.ADMIN_AUHT.TOKENS} tat
        ON
            tat.user_id = tau.id
        WHERE
            tat.token = ? AND
            tbo.token = ?
    `;
      const params = [token, domainToken];
      var data = await db.RunQuery(dbConstants.DBS.LIVE_DB, sqlQuery, params);
      if (data?.length) {
        return next();
      } else {
        return responseHandler.unauthorized(req, res);
      }
    } catch (error) {
      errorHandler.errorHandler(err, req, res);
    }
  },
};

exports.permissions = {};
