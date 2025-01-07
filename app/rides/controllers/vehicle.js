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

exports.get_city_info_operator_wise = async function (req, res) {
  try {
    var info = [];
    var city = req.allowed_city;
    var requestRideType = req.request_ride_type;
    var operator_id = req.operator_id;
    var autos_enabled = req.query.autos_enabled;
    var fleetId = req.fleet_id;
    var autos_str = ' ';
    var query_city = '';
    var values = [];
    var response = {};
    if (autos_enabled) {
      autos_str = ' AND autos_enabled = 1 ';
    }

    if (operator_id) {
      query_city = ' AND a.operator_id = ? ';
      values.push(operator_id);
    }
    if (city && city !== '0') {
      query_city += ` AND a.city_id IN (${city}) `;
    }
    var operatorName;

    var fetchCities = `SELECT a.city_id city_id, b.name, c.utc_offset, c.currency , a.feed_available, a.elm_verification_enabled, a.county_id AS country_id, a.operator_available, a.vehicle_model_enabled,a.polygon_coordinates FROM ${dbConstants.LIVE_DB.O_CITY} a JOIN ${dbConstants.LIVE_DB.CITY} c ON a.city_id = c.city_id LEFT JOIN ${dbConstants.LIVE_DB.OPERATPRS} b on a.operator_id = b.operator_id WHERE a.is_active = 1 and c.is_active = 1 ${query_city}`;

    var operatorCityData = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      fetchCities,
      values,
    );

    if (requestRideType) {
      operatorCityData = operatorCityData.filter((item) => {
        const operatorAvailableArray = JSON.parse(item.operator_available).map(
          String,
        );
        return operatorAvailableArray.includes(requestRideType);
      });
    }

    var cityIds = [];
    operatorName = operatorCityData[0].name;
    var operatorCities = {};
    for (var k in operatorCityData) {
      cityIds.push(operatorCityData[k].city_id);
      operatorCities[operatorCityData[k].city_id] = operatorCityData[k];
    }

    if (cityIds.length > 0) {
      autos_str += ' and autos_city_id in (?)';
    }

    var get_query = `SELECT
        city_id,
        city_name,
        DATE_FORMAT(next_invoicing_date,
          '%Y-%m-%d') AS next_invoicing_date,
        DATE_FORMAT(invoicing_done_till,
          '%Y-%m-%d') AS invoicing_done_till,
        latitude_lower,
        latitude_upper,
        longitude_lower,
        longitude_upper,
        show_venus_sharing
      FROM
      ${dbConstants.LIVE_DB.CITY}
        where is_active = 1
        ${autos_str}
      ORDER BY
        city_name ASC`;

    var cityData = await db.RunQuery(
      dbConstants.DBS.LIVE_LOGS,
      get_query,
      cityIds,
    );

    var vehicle_extra = ' ';
    var ride_type = ' ';
    var vehicle_extra_value = [];
    if (operator_id) {
      vehicle_extra_value.push(operator_id);
      vehicle_extra = ' and operator_id = ? ';
    }
    if (requestRideType == rideConstant.CLIENTS.MARS) {
      vehicle_extra_value.push(rideConstant.CLIENTS_RIDE_TYPE.MARS);
      ride_type = ' and ride_type = ? ';
    } else {
      vehicle_extra_value.push(rideConstant.CLIENTS_RIDE_TYPE.VENUS_TAXI);
      ride_type = ' and ride_type = ? ';
    }

    var vehicle_query = `SELECT
        city_id,
        operator_id,
        region_name,
        vehicle_type
      FROM
        tb_city_sub_regions
      WHERE
        is_active = 1  
         ${vehicle_extra}
         ${ride_type}
        and region_name !='AUTO POOL' 
        order by vehicle_type`;

    var vehicleData = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      vehicle_query,
      vehicle_extra_value,
    );

    var vehicleObj = {};

    for (var row of vehicleData) {
      var obj = {
        vehicle_type: row.vehicle_type,
        vehicle_name: row.region_name,
      };

      if (vehicleObj.hasOwnProperty(row.city_id)) {
        vehicleObj[row.city_id].push(obj);
      } else {
        vehicleObj[row.city_id] = [obj];
      }
    }

    for (var i = 0; i < cityData.length; i++) {
      var from_date = new Date(cityData[i].invoicing_done_till);
      from_date.setDate(from_date.getDate() + 1);
      from_date = ensure_prefix_month(from_date);
      var to_date = new Date(cityData[i].next_invoicing_date);
      to_date.setDate(to_date.getDate() - 1);
      to_date = ensure_prefix_month(to_date);
      var str = {
        city_id: cityData[i].city_id,
        utc_offset: operatorCities[cityData[i].city_id].utc_offset,
        currency: operatorCities[cityData[i].city_id].currency,
        city_name: cityData[i].city_name,
        invoicing_done_till: cityData[i].invoicing_done_till,
        next_invoice_date: cityData[i].next_invoicing_date,
        show_venus_sharing: cityData[i].show_venus_sharing,
        polygon_coordinates:
          operatorCities[cityData[i].city_id].polygon_coordinates,
        from_date: from_date,
        to_date: to_date,
        latitude_lower: cityData[i].latitude_lower,
        latitude_upper: cityData[i].latitude_upper,
        longitude_lower: cityData[i].longitude_lower,
        longitude_upper: cityData[i].longitude_upper,
        vehicles: vehicleObj[cityData[i].city_id] || [],
        operator_id: operator_id,
        feed_available: operatorCities[cityData[i].city_id].feed_available,
        elm_verification_enabled:
          operatorCities[cityData[i].city_id].elm_verification_enabled,
        vehicle_model_enabled:
          operatorCities[cityData[i].city_id].vehicle_model_enabled,
        country_id: operatorCities[cityData[i].city_id].country_id || 1,
      };
      info[i] = str;
    }

    var sqlQuery = `SELECT * FROM tb_countries where status =?`;
    var countries = await db.RunQuery(dbConstants.DBS.LIVE_DB, sqlQuery, [1]);

    if (requestRideType) {
      countries = countries.filter((item) => {
        if (item.operator_available) {
          const operatorAvailableArray = JSON.parse(
            item.operator_available,
          ).map(String);
          return operatorAvailableArray.includes(requestRideType);
        }
      });
    }

    response = {
      data: info,
      operator_name: operatorName,
      countries: countries,
    };

    if (fleetId) {
      var fleetNameQuery = `SELECT name from tb_fleet WHERE id = ?`;
      var values = [fleetId[0]];
      var fleetData = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        fleetNameQuery,
        values,
      );
      response['fleet_name'] = fleetData[0].name;
      return responseHandler.success(req, res, '', response);
    } else {
      return responseHandler.success(req, res, '', response);
    }
  } catch (error) {
    console.log(error);

    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchVehicles = async function (req, res) {
  try {
    var response = {},
      cityId = req.query.city_id,
      operatorId = req.operator_id,
      mandatoryFields = [cityId, operatorId];

    if (rideHelper.checkBlank(mandatoryFields)) {
      return responseHandler.parameterMissingResponse(res, mandatoryFields);
    }

    cityId = cityId.toString().split(',');
    var requestRideType = req.request_ride_type;
    var requiredVehicleKeys = [
      'vehicle_type',
      'region_id',
      'region_name',
      'ride_type',
      'images',
    ];

    var vehicleCriteria = [
      { key: 'operator_id', value: operatorId },
      { key: 'city_id', value: cityId },
      { key: 'is_active', value: 1 },
    ];

    if (requestRideType == rideConstant.CLIENTS.MARS) {
      vehicleCriteria.push({
        key: 'ride_type',
        value: rideConstant.CLIENTS_RIDE_TYPE.MARS,
      });
    } else {
      vehicleCriteria.push({
        key: 'ride_type',
        value: rideConstant.CLIENTS_RIDE_TYPE.VENUS_TAXI,
      });
    }

    // var vehicleValues = {};
    let vehicleValues = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
      requiredVehicleKeys,
      vehicleCriteria,
    );
    return responseHandler.success(
      req,
      res,
      'Vehicle list fetched.',
      vehicleValues,
    );
  } catch (error) {
    console.log(error);

    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchVehicleMake = async function (req, res) {
  try {
    let options = req.query;
    var requestRideType = req.request_ride_type;
    let response = {};

    delete req.query.token;

    let schema = Joi.object({
      city_id: Joi.number().required(),
      secret_key: Joi.number().optional(),
    });

    let result = schema.validate(options);
    if (result.error) {
      response = { error: 'some parameter missing', flag: 0 };
      res.send(response);
      return;
    }

    var cityId = req.query.city_id;
    var operatorId = req.operator_id;
    var requestRideType = req.query.service_type;

    var vehicleMakeQuery = `
            SELECT 
                vm.*,
                cr.region_name 
            FROM
                tb_vehicle_make vm
            JOIN
                 tb_city_sub_regions cr ON cr.vehicle_type = vm.vehicle_type AND cr.operator_id = vm.operator_id AND cr.ride_type = ? AND cr.city_id = ? AND cr.is_active = 1
            WHERE 
                vm.city_id = ? AND 
                vm.operator_id = ?`;

    if (requestRideType == rideConstant.CLIENTS.MARS) {
      vehicleMakeQuery += ' AND cr.ride_type = 10';
    } else {
      vehicleMakeQuery += ' AND cr.ride_type = 0';
    }
    vehicleMakeQuery += `
            ORDER BY 
            vm.updated_at DESC`;

    const values = [];

    if (requestRideType == rideConstant.CLIENTS.MARS) {
      values.push(rideConstant.CLIENTS_RIDE_TYPE.MARS);
    } else {
      values.push(rideConstant.CLIENTS_RIDE_TYPE.VENUS_TAXI);
    }
    values.push(cityId, cityId, operatorId);
    var vehicleMakeResult = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      vehicleMakeQuery,
      values,
    );
    return responseHandler.success(
      req,
      res,
      'Data Fetched Successfully',
      vehicleMakeResult,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
function ensure_prefix_month(date) {
  var prefix = '';
  if (date.getMonth() + 1 < 10) {
    prefix = '0';
  }
  date =
    date.getFullYear() +
    '-' +
    prefix +
    '' +
    (date.getMonth() + 1) +
    '-' +
    date.getDate();
  return date;
}
