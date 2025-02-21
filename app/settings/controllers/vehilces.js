const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
} = require('../../../bootstart/header');
var moment = require('moment');
var QueryBuilder = require('datatable');
var Joi = require('joi');
const Helper = require('../helper');
const rideHelper = require('../../rides/helper');

exports.fetchVehicles = async function (req, res) {
  try {
    var response = {},
      cityId = req.query.city_id,
      operatorId = req.operator_id,
      mandatoryFields = [cityId, operatorId];

    var requestRideType = req.request_ride_type;
    var requiredVehicleKeys = [
      'vehicle_type',
      'region_id',
      'region_name',
      'ride_type',
    ];

    var vehicleCriteria = [
      { key: 'operator_id', value: operatorId },
      { key: 'city_id', value: cityId },
      { key: 'is_active', value: 1 },
    ];

    if (requestRideType == rideConstants.CLIENTS.MARS) {
      vehicleCriteria.push({
        key: 'ride_type',
        value: rideConstants.CLIENTS_RIDE_TYPE.MARS,
      });
    } else {
      vehicleCriteria.push({
        key: 'ride_type',
        value: rideConstants.CLIENTS_RIDE_TYPE.VENUS_TAXI,
      });
    }
    var vehicleValues = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SUB_REGIONS}`,
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
    errorHandler.errorHandler(error, req, res);
  }
};

exports.operatorCityInfo = async function (req, res) {
  try {
    var response = {};
    var info = [];

    var city = req.allowed_city;
    var requestRideType = req.request_ride_type;
    var operator_id = req.operator_id;
    var autos_enabled = req.query.autos_enabled;
    var fleetId = req.fleet_id;
    var autos_str = ' ';
    var query_city = '';
    var values = [];
    if (autos_enabled) {
      autos_str = ' and autos_enabled = 1 ';
    }

    if (operator_id) {
      query_city = ' and a.operator_id = ? ';
      values.push(operator_id);
    }
    if (city && city !== '0') {
      query_city += ` and a.city_id IN (${city}) `;
    }

    var operatorName;
    var fetchCities = `
        select 
        a.city_id city_id, 
        b.name, c.utc_offset, 
        c.currency , a.feed_available,
        a.elm_verification_enabled,
        a.county_id AS country_id,
        a.operator_available,
        a.vehicle_model_enabled,a.polygon_coordinates
        FROM  ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY} a
        LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY} c on a.city_id = c.city_id
        LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATPRS} b on a.operator_id = b.operator_id 
        WHERE a.is_active = 1 AND c.is_active = 1 ${query_city}`;

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
      autos_str += ` and autos_city_id in (${cityIds})`;
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
				  ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.CITIES}
				  where is_active = 1
				  ${autos_str}
				ORDER BY
				  city_name ASC`;

    var data = await db.RunQuery(dbConstants.DBS.LIVE_LOGS, get_query, []);

    var vehicle_extra = ' ';
    var ride_type = ' ';
    var vehicle_extra_value = [];
    if (operator_id) {
      vehicle_extra_value.push(operator_id);
      vehicle_extra = ' and operator_id = ? ';
    }
    if (requestRideType == rideConstants.CLIENTS.MARS) {
      vehicle_extra_value.push(rideConstants.CLIENTS_RIDE_TYPE.MARS);
      ride_type = ' and ride_type = ? ';
    } else {
      vehicle_extra_value.push(rideConstants.CLIENTS_RIDE_TYPE.VENUS_TAXI);
      ride_type = ' and ride_type = ? ';
    }
    var vehicle_query = `SELECT
            city_id,
            operator_id,
            region_name,
            vehicle_type
          FROM
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SUB_REGIONS}
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

    for (var i = 0; i < data.length; i++) {
      var from_date = new Date(data[i].invoicing_done_till);
      from_date.setDate(from_date.getDate() + 1);
      from_date = ensure_prefix_month(from_date);
      var to_date = new Date(data[i].next_invoicing_date);
      to_date.setDate(to_date.getDate() - 1);
      to_date = ensure_prefix_month(to_date);
      var str = {
        city_id: data[i].city_id,
        utc_offset: operatorCities[data[i].city_id].utc_offset,
        currency: operatorCities[data[i].city_id].currency,
        city_name: data[i].city_name,
        invoicing_done_till: data[i].invoicing_done_till,
        next_invoice_date: data[i].next_invoicing_date,
        show_venus_sharing: data[i].show_venus_sharing,
        polygon_coordinates:
          operatorCities[data[i].city_id].polygon_coordinates,
        from_date: from_date,
        to_date: to_date,
        latitude_lower: data[i].latitude_lower,
        latitude_upper: data[i].latitude_upper,
        longitude_lower: data[i].longitude_lower,
        longitude_upper: data[i].longitude_upper,
        vehicles: vehicleObj[data[i].city_id] || [],
        operator_id: operator_id,
        feed_available: operatorCities[data[i].city_id].feed_available,
        elm_verification_enabled:
          operatorCities[data[i].city_id].elm_verification_enabled,
        vehicle_model_enabled:
          operatorCities[data[i].city_id].vehicle_model_enabled,
        country_id: operatorCities[data[i].city_id].country_id || 1,
      };
      info[i] = str;
    }

    var sqlQuery = `SELECT * FROM ${dbConstants.LIVE_DB.COUNTRY} where status =?`;
    var countries = await await db.RunQuery(dbConstants.DBS.LIVE_DB, sqlQuery, [
      1,
    ]);
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

    return responseHandler.success(req, res, response);
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
