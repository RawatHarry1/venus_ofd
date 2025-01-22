const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  rideConstants,
  ResponseConstants,
  generalConstants,
  authConstants,
} = require('../../../bootstart/header');
var moment = require('moment');
var Joi = require('joi');
const Helper = require('../helper');
const rideConstant = require('../../../constants/rideConstants');
const { checkBlank } = require('../../rides/helper');

exports.getTolls = async function (req, res) {
  try {
    var cityId = req.body.city_id;
    var operatorId = req.operator_id;
    var requestRideType = req.request_ride_type
    var checkValues = checkBlank([cityId]);
    if (checkValues == 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    req.body.request_ride_type = requestRideType
    let data = await Helper.getTolldata(req.body, operatorId);

    if (!data) {
      return responseHandler.returnErrorMessage(
        res,
        `Someting Went wrong`,
      );
    }

    return responseHandler.success(req, res, 'Toll data fetched', data);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.insertToll = async function (req, res) {
  try {
    var operatorId = req.operator_id;
    let rBody = req.body;
    let cityId = rBody.city_id;
    let amount = rBody.amount;
    let geofenceType = rBody.geofenceType || 1;
    let name = rBody.name;
    let vehicleType = rBody.vehicle_type;
    let isInsertData = rBody.is_insert;
    let tollId = rBody.toll_id;
    let requestRideType = req.request_ride_type
    if (isInsertData) {
      var checkValues = checkBlank([
        cityId,
        operatorId,
        amount,
        name,
        vehicleType,
        isInsertData,
        requestRideType
      ]);
    } else {
      var checkValues = checkBlank([cityId, operatorId, isInsertData, tollId]);
    }
    if (checkValues == 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    rBody.insertData = isInsertData;
    rBody.geofence_type = geofenceType;
    rBody.operator_id = operatorId;
    rBody.request_ride_type = requestRideType
    let data = await Helper.insertGeofenceData(rBody);

    if (!data) {
      return responseHandler.returnErrorMessage(
        res,
        `Someting Went wrong`,
      );
    }

    return responseHandler.success(req, res, 'Toll data inserted', data);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
