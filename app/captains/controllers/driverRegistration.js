const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
  } = require('../../../bootstart/header');
  
  const rideConstant = require('../../../constants/rideConstants');
  const rideHelper = require('../helper');
  var Joi = require('joi');
  var QueryBuilder = require('datatable');
  
  exports.getCaptains = async function (req, res) {
    try {
        var  response ={};
        var cityId = parseInt(req.body.city_id);
        var vehicleType = parseInt(req.body.vehicle_type);
        var fleetId = req.fleet_id;
        var requestRideType = req.request_ride_type
        var operatorId = req.operator_id || 1;
        let orderDirection   = req.body.sSortDir_0 || "DESC";
        orderDirection = (orderDirection.toUpperCase() == 'ASC') ? 'ASC' : 'DESC';
        var tab = req.body.tab;

    return responseHandler.success(req, res, '', response);
    
    } catch (error) {
      errorHandler.errorHandler(error, req, res);
    }
  };