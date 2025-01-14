const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  generalConstants,
  rideConstants,
} = require('../../../bootstart/header');

const Helper = require('../helper');
var Joi = require('joi');
const pushNotificationHelper = require('../../push_notification/helper');
const {
  postRequsestFormData,
  putRequestFormData,
} = require('../../captains/helper');
var fs = require('fs');

exports.getClients = async function (req, res) {
  var response = {};
  try {
    let operatorId = req.operator_id;
    var requestRideType = req.request_ride_type;

    let cityId = req.query.city_id;

    let whereClause = [],
      values = [];

    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.operator_id = ? `);
    values.push(operatorId);

    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.city = ?`);
    values.push(cityId);
    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.reg_as = ?`);
    values.push(0);
    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.can_request = ?`);
    values.push(1);

    if (req.query.sSearch) {
      whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.user_name LIKE ?`);
      values.push('%' + req.query.sSearch + '%');
    }

    if (whereClause.length) {
      whereClause = ' ' + whereClause.join(' AND ');
    } else {
      whereClause = '';
    }

    let limit = Number(req.query.iDisplayLength || 50);
    let offset = Number(req.query.iDisplayStart || 0);
    let orderDirection = req.query.sSortDir_0 || 'DESC';
    orderDirection = orderDirection.toUpperCase() == 'ASC' ? 'ASC' : 'DESC';

    let queryTotalCount = `
        SELECT 
            COUNT(${dbConstants.LIVE_DB.CUSTOMERS}.user_id) AS total_count
        FROM
           ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}  FORCE KEY(operator_id)
        WHERE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}.operator_id = ? 
        AND ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}.reg_as = 0
    `;
    let totalRecords = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queryTotalCount,
      [operatorId],
    );

    values.push(limit);
    values.push(offset);
    let queryData = `
        SELECT 
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_id,
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_name, 
            ${dbConstants.LIVE_DB.CUSTOMERS}.phone_no,
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_email, 
            UNIX_TIMESTAMP(last_login) as last_login,
            UNIX_TIMESTAMP(last_ride_on) as last_ride_on,
            ${dbConstants.LIVE_DB.CUSTOMERS}.total_rides_as_user,
            ${dbConstants.LIVE_DB.CUSTOMERS}.current_location_latitude AS latitude,
            ${dbConstants.LIVE_DB.CUSTOMERS}.current_location_longitude AS longitude,
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_image AS customer_image,
            UNIX_TIMESTAMP(date_registered) as date_registered 
        FROM
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} FORCE KEY(operator_id)
        WHERE
            ${whereClause}
        ORDER BY 
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_id ${orderDirection}
        LIMIT ? OFFSET ?
    `;

    let paginatedRecords = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queryData,
      values,
    );
    response = {
      aaData: paginatedRecords,
      iTotalDisplayRecords: paginatedRecords.length,
      iTotalRecords: totalRecords[0].total_count,
    };
    return responseHandler.success(req, res, 'User Details Sent', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.isUserPresent = async function (req, res) {
  try {
    delete req.body.token;

    let schema = Joi.object({
      phone_no: Joi.string().required(),
      secret_key: Joi.number().optional(),
    });

    let result = schema.validate(req.body);
    var response = {};
    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    let phoneNumber = req.body.phone_no;
    let operatorId = req.operator_id;
    let corporateId = req.corporate_id;

    let userDetails = await Helper.validateUserUsingIdOrPhone(
      'phone_no',
      phoneNumber,
      operatorId,
      generalConstants.userRegistrationStatus.CUSTOMER,
    );

    if (corporateId) {
      let userCorporateDetails = await Helper.checkUserCorporate(
        corporateId,
        userDetails.user_id,
      );
      if (!userCorporateDetails.length) {
        throw new Error('The user does not exist for this corporate');
      }
    }
    return responseHandler.success(req, res, 'User Details Sent', userDetails);
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getCustomers = async function (req, res) {
  try {
    delete req.query.token;
    let schema = Joi.object({
      user_bucket: Joi.number().min(1).max(3).required(),
      city_id: Joi.number().required(),
      fetch_customer_count: Joi.number().min(0).max(1).required(),
      secret_key: Joi.number().optional(),
    });
    let impData = {
      user_bucket: req.query.user_bucket,
      city_id: req.query.city_id,
      fetch_customer_count: req.query.fetch_customer_count,
    };
    let result = schema.validate(impData);

    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    let userInfo = {};
    let userBucket = +req.query.user_bucket;
    let city = +req.query.city_id;
    let fetchCustomerCount = +req.query.fetch_customer_count;
    userInfo.operator_id = req.operator_id;
    userInfo.city = city;

    switch (
      userBucket // userBucket = 1 means all users
    ) {
      case 2:
        userInfo.device_type = 0; // Android Users
        break;
      case 3:
        userInfo.device_type = 1; // IOS Users
        userBucket = 2;
        break;
    }

    let users = await Helper.fetchUserListWithPagination(
      userInfo,
      userBucket,
      req.query,
    );

    return responseHandler.success(req, res, 'User Details Sent', users);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.sendLoginOtp = async function (req, res) {
  try {
    req.body.operator_token = req.headers.operatortoken;

    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.SEND_LOGIN_OTP;

    delete req.body.token;

    let response = await pushNotificationHelper.pushFromRideServer(
      req.body,
      endpoint,
      req,
    );

    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.verifyOtp = async function (req, res) {
  try {
    req.body.operator_token = req.headers.operatortoken;

    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.VERIFY_OTP;

    delete req.body.token;

    let response = await pushNotificationHelper.pushFromRideServer(
      req.body,
      endpoint,
      req,
    );

    return responseHandler.success(req, res, 'User Details Sent', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.createCustomerProfile = async function (req, res) {
  try {
    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.CUSTOMER_PROFILE;

    delete req.body.token;
    if (req.file && req.file.path) {
      req.body.updatedUserImage = fs.createReadStream(req.file.path);
    }

    let response = await putRequestFormData(req.body, endpoint, req);

    return responseHandler.success(req, res, 'User Details Sent', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.createCustomer = async function (req, res) {
  try {
    let requestBody = req.body;
    let operatorId = req.operator_id;
    var requestRideType = req.request_ride_type;
    let cityId = requestBody.city_id;
    let firstName = requestBody.first_name;
    let lastName = requestBody.last_name;
    let userName = requestBody.user_name;
    let phoneNumber = requestBody.phone_no;
    let email = requestBody.email;
    let countryCode = requestBody.country_code;
    let isExist;

    delete requestBody.token;

    let schema = Joi.object({
      phone_no: Joi.string().required(),
      city_id: Joi.string().required(),
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      user_name: Joi.string().required(),
      email: Joi.string().required(),
      country_code: Joi.string().required(),
      secret_key: Joi.number().optional(),
    });

    let schemaResult = schema.validate(requestBody);
    if (schemaResult.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var fetchQuery = `SELECT user_email FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} WHERE phone_no = ? AND operator_id = ?`;

    isExist = await db.RunQuery(dbConstants.DBS.LIVE_DB, fetchQuery, [
      phoneNumber,
      operatorId,
    ]);

    if (isExist.length) {
      return responseHandler.returnErrorMessage(
        res,
        `User with this phone Already exists Please try with different one.`,
      );
    }

    var fetchQuery = `SELECT user_email FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} WHERE user_email = ? AND operator_id = ?`;

    isExist = await db.RunQuery(dbConstants.DBS.LIVE_DB, fetchQuery, [
      email,
      operatorId,
    ]);

    if (isExist.length) {
      return responseHandler.returnErrorMessage(
        res,
        `User with this email Already exists Please try with different one.`,
      );
    }

    let insertQuery = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} (
      user_name, first_name, last_name, 
      country_code, phone_no, operator_id, 
      user_email, city
    ) 
    VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?)`;
    let values = [
      userName,
      firstName,
      lastName,
      countryCode,
      phoneNumber,
      operatorId,
      email,
      cityId,
    ];
    let result = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      insertQuery,
      values,
    );

    if (result) {
      insertQuery = `INSERT INTO ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.AUTH_USERS} (user_name, first_name, last_name, country_code, phone_no, operator_id ,user_email,city_reg,venus_autos_user_id,venus_user_name) VALUES (?,?,?,?,?,?,?,?,?,?)`;
      values = [
        userName,
        firstName,
        lastName,
        countryCode,
        phoneNumber,
        operatorId,
        email,
        cityId,
        result.insertId,
        userName,
      ];
      await db.RunQuery(dbConstants.DBS.ADMIN_AUTH, insertQuery, values);
      return responseHandler.success(req, res, 'Customer Created', {});
    }
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
