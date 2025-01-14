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
    var checkValues = checkBlank([cityId]);
    if (checkValues == 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    let data = await Helper.getTolldata(req.body, operatorId);

    if (!data) {
      throw new Error('Someting Went wrong');
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
    let preTollPolygon = rBody.pre_toll_polygon;
    let postTollPolygon = rBody.post_toll_polygon;
    if (isInsertData) {
      var checkValues = checkBlank([
        cityId,
        operatorId,
        amount,
        name,
        vehicleType,
        isInsertData,
      ]);
    } else {
      var checkValues = checkBlank([
        cityId,
        operatorId,
        amount,
        name,
        vehicleType,
        isInsertData,
        tollId,
      ]);
    }
    if (checkValues == 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    rBody.insertData = isInsertData;
    rBody.geofence_type = geofenceType;
    rBody.operator_id = operatorId;
    let data = await Helper.insertGeofenceData(rBody);

    if (!data) {
      throw new Error('Someting Went wrong');
    }

    return responseHandler.success(req, res, 'Toll data inserted', data);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
