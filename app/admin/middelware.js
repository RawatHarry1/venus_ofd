const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  generalConstants,
  authConstants,
  rideConstants
} = require('../../bootstart/header');
const { checkBlank } = require('../rides/helper');
const Helper = require('./helper');

exports.admin = {
  isLoggedIn: async function (req, res, next) {
    var token = req.query.token || req.body.token;
    var cityId = req.query.city || req.body.city || req.query.city_id || req.body.city_id;
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
      req.operator_token = req.headers.domain_token || req.body.domain_token || req.query.domain_token;
      req.token = token;
      next();
    } else {
      return responseHandler.unauthorized(req, res);
    }
  },
  domainToken: async function (req, res, next) {
    try {
      const token = req.body.token || req.query.token;
      const domainToken = req.headers.domain_token || req.body.domain_token || req.query.domain_token;

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
  useControlPanelApi: async function (req, res, next) {
    req.body.cp_operator_id = req.operator_id;
    req.body.operator_id = -1;
    req.body.super_admin_panel = generalConstants.SUPER_ADMIN_PANEL;
    next()
  }
};

exports.city = {
  exec: function (req, res, next) {
      var required_permissions =
              [{
                  panel_id: authConstants.PANEL.SMP,
                  city_id: req.body.city || req.body.city_id || req.query.city || req.query.city_id,
                  level_id: [
                    authConstants.LEVEL.SUPER_ADMIN,
                    authConstants.LEVEL.ADMIN,
                    authConstants.LEVEL.CITY_SUPPLY_MANAGER,
                    authConstants.LEVEL.ASSISTANT_MANAGER,
                    authConstants.LEVEL.SENIOR_EXECUTIVE,
                    authConstants.LEVEL.EXECUTIVE,
                    authConstants.LEVEL.ALL
                  ]
              }],
          e = null;

      if (!Helper.verifyPermissions(req.permissions, required_permissions)) {
          e = new Error('Not permitted, contact panel admin!');
          e.status = 403;
          return next(e);
      }
      next();
  },
  checkUserLevel: function (req, res, next) {
    var permissions_required =
      [{
        "panel_id": authConstants.PANEL.AUTOS_PANEL,
        "level_id": [authConstants.LEVEL.ADMIN],
        "city_id": rideConstants.CITIES.DEFAULT_CITY_ID
      }];
    req.reference_id = '';
    var e = null;
    if (!Helper.verifyPermissions(req.permissions, permissions_required)) {
      e = new Error('Not permitted, contact panel admin!');
      e.status = 403;
      return next(e);
    }
    next();
  },
  getEngagementInfo: function (req, res, next) {
    var permissions_required =
        [
            {
            "panel_id": authConstants.PANEL.CSP,
            "level_id": [authConstants.LEVEL.ADMIN, authConstants.LEVEL.TEAM_LEAD,
              authConstants.LEVEL.REGULAR],
            "city_id": rideConstants.CITIES.DEFAULT_CITY_ID
            }
        ],
        e = null;
    req.reference_id = "";

    if(!Helper.verifyPermissions(req.permissions,permissions_required)) {
        var e = new Error("Not permitted, contact panel admin!");
        e.status = 403;
        return next(e);
    }
    next();
  },
  getDetailsForUser: async function (req, res, next) {
    var userId = req.body.user_id;
    var keyType = parseInt(req.body.search_key);
    var operatorId = req.operator_id;

    var checkValues = checkBlank([userId, keyType, operatorId]);
    if (checkValues == 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    var permissions_required =
      [
        {
          "panel_id": authConstants.PANEL.CSP,
          "level_id": [authConstants.LEVEL.REGULAR, authConstants.LEVEL.ADMIN, authConstants.LEVEL.TEAM_LEAD],
          "city_id": authConstants.LEVEL.ALL
        }
      ],
      error = null;
    req.reference_id = "";

    if (!Helper.verifyPermissions(req.permissions, permissions_required)) {
      error = new Error("Not permitted, contact panel admin!");
      error.status = 403;
      return next(error);
    }
    var userFound = {};

    await Helper.sqlQueryForAutos(req, keyType, userId, operatorId, userFound)
    await Helper.sqlQueryForVendors(req, keyType, userFound, userId, operatorId)



    if ((!userFound.isVendor && !userFound.isAutosUser)
      || (operatorId != 1 && !userFound.isAutosUser)) {
      throw new Error("INVALID USER");
    }

    req.body.isAutosUser = userFound.isAutosUser;
    req.body.isVendor = userFound.isVendor;
    req.body.keyType = keyType;
    req.body.verificationStatus = userFound.verificationStatus;
    next();
  },
  getDriverInfo: async function (req, res, next) {
    var operatorId = req.operator_id;
    var permissions_required =
      [
        {
          "panel_id": authConstants.PANEL.CSP,
          "level_id": [authConstants.LEVEL.REGULAR, authConstants.LEVEL.ADMIN, authConstants.LEVEL.TEAM_LEAD],
          "city_id": authConstants.LEVEL.ALL
        }
      ],
        error = null;
    req.reference_id = "";

    if (!Helper.verifyPermissions(req.permissions, permissions_required)) {
      error = new Error("Not permitted, contact panel admin!");
      error.status = 403;
      return next(error);
    }

    var userId = req.body.driver_id, queryParams = [], operatorId = req.operator_id;
    var searchKey = parseInt(req.body.search_key);
    var getUserIdQuery =
      `SELECT driver_id as user_id FROM ${dbConstants.DBS.LIVE_DB}.tb_drivers WHERE operator_id = ? `
    queryParams.push(operatorId);

    switch (searchKey) {
      case rideConstants.DRIVER_DETAIL_SEARCH_KEY.DRIVER_ID:
        getUserIdQuery += " AND driver_id = ?";
        break;
      case rideConstants.DRIVER_DETAIL_SEARCH_KEY.DRIVER_AUTO_NO:
        getUserIdQuery += " AND vehicle_no = ?";
        break;
      case rideConstants.DRIVER_DETAIL_SEARCH_KEY.DRIVER_PHONE:
        getUserIdQuery += " AND (phone_no = ? or alternate_phone_no = ? )";
        queryParams.push(userId);
        break;
    }
    queryParams.push(userId);

    let driver = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      getUserIdQuery,
      queryParams,
    );
    if (!driver) {
      throw new Error("Invalid Driver id");
    }

    req.body.driver_id = driver[0].user_id;

    next();
  }
};

exports.documents = {
  checkMultipleVehicleEnableHelper: async function (req, res, next) {
    var cityId = req.query.city_id || req.body.city_id || req.params.city_id || "";

    if (cityId) {
      var sql = `SELECT * FROM ${dbConstants.LIVE_DB.O_CITY} where city_id = ?`;

      var data = await db.RunQuery(dbConstants.DBS.LIVE_DB, sql, [cityId]);
      if (data.length) {
        req.multipleVehicleEnable = data[0].multiple_vehicles;
      }
      else {
        req.multipleVehicleEnable = 0;
      }
      next();
    }
    else {
        req.multipleVehicleEnable = 0;
        next();
    }
  }
};


exports.permissions = {};
