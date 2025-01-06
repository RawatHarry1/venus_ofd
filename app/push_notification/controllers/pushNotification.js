const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  authConstants,
} = require('../../../bootstart/header');

const Helper = require('../helper');
var Joi = require('joi');
const { checkBlank } = require('../../rides/helper');
const { verifyPermissions } = require('../../admin/helper');

exports.sendSmsPushToDriver = async function (req, res) {
  try {
    let params = req.body,
      driverData = params.drivers;
    params.operator_id = req.operator_id;
    params.sent_from = 'SMP';
    let checkBlankStatus = checkBlank([
      params.sent_by,
      params.message,
      params.type,
      driverData,
    ]);
    if (checkBlankStatus == 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    let responseLog;
    const stmt = ` SELECT driver_id, phone_no, city_id, country_code FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} WHERE   driver_id IN (?) AND operator_id = ?`;
    let queryParams = [];
    for (let row of driverData) {
      queryParams.push(row.driver_id);
    }

    queryParams = queryParams.join(',');

    let dataToSend = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, [
      queryParams,
      params.operator_id,
    ]);

    if (!dataToSend || !dataToSend.length) {
      throw new Error('No drivers found');
    }

    if (params.type == 1) {
      await Helper.sendPush(dataToSend, params);
      responseLog = 'Sent push successfully';
    } else if (params.type == 2) {
      // let required_permissions =
      //   [{
      //     panel_id: authConstants.PANEL.SMP,
      //     city_id: req.body.city || req.body.city_id || req.query.city || req.query.city_id,
      //     level_id: [
      //       authConstants.LEVEL.SUPER_ADMIN,
      //       authConstants.LEVEL.ADMIN
      //     ]
      //   }],
      //   e = null;
      // if (!verifyPermissions(req.permissions, required_permissions)) {
      //   e = new Error('Not permitted, contact panel admin!');
      //   e.status = 403;
      //   return next(e);
      // }
      // await Helper.sendSmsV2(dataToSend, params);

      responseLog = 'Sent sms successfully';
    } else if (params.type == 3) {
      await Helper.sendPush(dataToSend, params);
      // await Helper.sendSmsV2(dataToSend, params);
      responseLog = 'Sent push and sms successfully';
    }

    return responseHandler.success(req, res, '', (responseLog = ''));
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.contactCustomers = async function (req, res) {
  try {
    /* 
    PENDING
    */

    return responseHandler.success(req, res, '', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
