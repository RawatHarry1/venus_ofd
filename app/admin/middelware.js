const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
} = require('../../bootstart/header');
const Helper = require('./helper');
exports.admin = {
  isLoggedIn: async function (req, res, next) {
    var token = req.query.token || req.body.token;
    var cityId =
      req.query.city || req.body.city || req.query.city_id || req.body.city_id;
    if (!token) {
      return responseHandler.unauthorized(req, res);
    }
    let isLoginIn = await Helper.tokenVailed(token);
    if (isLoginIn && isLoginIn.length) {
      req.user_id = isLoginIn[0].user_id;
      let validOpertor = await Helper.isValidOperator(isLoginIn[0].user_id);
      req.operator_id = validOpertor[0].operator_id;
      var requestRideType = req.headers.request_ride_type || '1';
      req.request_ride_type = requestRideType;
      req.city = cityId;
      req.allowed_city = validOpertor[0].city;
      req.user_id = validOpertor[0].id;
      req.email_from_acl = validOpertor[0].email;
      req.name_from_acl = validOpertor[0].name;
      req.fleet_id = validOpertor[0].fleet_id;
      req.token = token;
      next();
    } else {
      return responseHandler.unauthorized(req, res);
    }
  },
  domainToken: async function (req, res, next) {
    try {
      const token = req.body.token || req.query.token;
      const domainToken =
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
            ${dbConstants.DBS.ADMIN_AUTH}.${dbConstants.ADMIN_AUTH.ACL_USER} tau
        ON
            tbo.operator_id = tau.operator_id
        INNER JOIN
            ${dbConstants.DBS.ADMIN_AUTH}.${dbConstants.ADMIN_AUTH.TOKENS} tat
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
      errorHandler.errorHandler(error, req, res);
    }
  },
};

exports.permissions = {};
