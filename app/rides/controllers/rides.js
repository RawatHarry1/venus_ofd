const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const Helper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');
const { getOperatorParameters } = require('../../admin/helper');
var moment = require('moment');

exports.getRides = async function (req, res) {
  try {
    let {
      city_id: cityId,
      status,
      vehicle_type: vehicleType,
      fleet_id: fleetId,
      sSortDir_0: orderDirection = 'DESC',
      iDisplayLength: limit = 50,
      iDisplayStart: offset = 0,
      sSearch,
    } = req.query;

    status = +status;
    let operatorId = req.operator_id;

    delete req.query.token;

    const schema = Joi.object({
      city_id: Joi.number().required(),
      status: Joi.number().min(1).max(50).required(),
    }).unknown(true);

    var requestRideType = req.request_ride_type;

    if (status !== rideConstant.DASHBOARD_RIDE_STATUS.COMPLETED) {
      const validation = schema.validate(req.query);
      if (validation.error) {
        const response = {
          flag: ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING,
          message: validation.error.message || 'Params missing',
        };
        return res.send(response);
      }
    }

    const rideStatus = {
      1: [
        rideConstant.ENGAGEMENT_STATUS.ACCEPTED,
        rideConstant.ENGAGEMENT_STATUS.STARTED,
        rideConstant.ENGAGEMENT_STATUS.ARRIVED,
      ],
      2: [rideConstant.ENGAGEMENT_STATUS.ENDED],
      4: [
        rideConstant.ENGAGEMENT_STATUS.ACCEPTED_THEN_REJECTED,
        rideConstant.ENGAGEMENT_STATUS.RIDE_CANCELLED_BY_CUSTOMER,
        rideConstant.ENGAGEMENT_STATUS.RIDE_ENDED_BY_CRONE,
      ],
      5: rideConstant.ENGAGEMENT_STATUS.CANCELLED_BY_CUSTOMER,
    };

    var ridesQuery = Helper.ridesQueryHelper(null, null, null, status);
    ridesQuery += ` WHERE e.city = ? AND e.status IN (?) AND d.operator_id = ? AND u.operator_id = ? AND e.request_made_on >= NOW() - INTERVAL 24 HOUR`;
    var values = [
      cityId,
      Array.isArray(rideStatus[status])
        ? rideStatus[status].join(',')
        : rideStatus[status],
      operatorId,
      operatorId
    ];

    if (fleetId) {
			ridesQuery += ` AND d.fleet_id IN (?) `
			values.push(fleetId)
		}

    if(requestRideType){
			ridesQuery += ` AND s.service_type IN (?) `
			values.push(requestRideType)
		}

    if(vehicleType){
			ridesQuery += ` AND e.vehicle_type IN (?) `
			values.push(vehicleType)
		}

		if (sSearch) {
			ridesQuery += ` AND e.engagement_id LIKE '%${sSearch}%'`;
	  }

    const ongoingRideQuery = ridesQuery
    let ongoingQueryValues = values

    ridesQuery += `
    ORDER BY 
    e.engagement_id ${orderDirection}
    LIMIT ? OFFSET ?
    `;
    values.push(limit,offset)


    if (status == rideConstant.DASHBOARD_RIDE_STATUS.MISSED) {
      ridesQuery = `SELECT
			   a.session_id,
			   a.date,
			   a.request_latitude AS lat,
			   a.request_longitude AS lon,
			   a.request_address,
			   a.request_address,
			   b.user_name,
			   b.phone_no,
			   a.service_type,
			   op_drop_latitude AS drop_latitude,
			   op_drop_longitude AS drop_longitude
			FROM
			   ${config.get('venus_live_server')}.tb_session a
			   JOIN ${config.get('venus_live_server')}.tb_users b ON a.user_id = b.user_id
			WHERE
			   (
				a.ride_acceptance_flag = 0
				AND is_active != ? 
				AND cancelled_by_user = 0
				AND a.date >= NOW() - INTERVAL 24 HOUR
				AND a.operator_id = ?
				AND a.city = ?
				AND a.service_type = ?
			   )
			ORDER by a.session_id DESC`;

      values = [
        constants.sessionStatus.ACTIVE,
        operatorId,
        cityId,
        requestRideType,
      ];
    } else if (status == rideConstant.DASHBOARD_RIDE_STATUS.COMPLETED) {
      var get_data = `
					${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES} e 
				JOIN 
					${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} u ON e.user_id = u.user_id 
				JOIN 
					${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} d ON e.driver_id = d.driver_id 
				JOIN 
					${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.IN_THE_AIR} s ON e.session_id = s.session_id  
                NEW_CONDITION e.city = ? AND 
					e.status IN (?) AND 
					d.operator_id = ? AND 
					u.operator_id = ?  
		`;
      get_data += `  AND e.request_made_on BETWEEN '${req.query.start_date}' AND '${req.query.end_date}'  `;
      if (requestRideType) {
        get_data += `  AND s.service_type = '${requestRideType}' `;
      }
      if (vehicleType) {
        get_data += `  AND e.vehicle_type = '${vehicleType}'  `;
      }

      if (sSearch) {
        get_data += ` AND e.engagement_id LIKE '%${sSearch}%'`;
      }

      let tableDefinition = {
        sSelectSql: `e.pickup_location_address, 
				e.pickup_latitude, 
				e.pickup_longitude, 
				e.drop_location_address, 
				e.pickup_time, 
				e.drop_time,
				0 AS is_vip, 
				e.request_made_on, 
				e.accept_time, 
				e.engagement_id, 
				e.addn_info, 
				e.status, 
				u.user_name, 
				u.phone_no, 
				u.user_id, 
				d.name as driver_name, 
				d.driver_id, 
				d.vehicle_no,
				s.service_type,
				s.op_drop_longitude AS drop_longitude,
				e.city,
				e.vehicle_type,
				s.op_drop_latitude AS drop_latitude`,
        sFromSql: get_data,
        sCountColumnName: `e.engagement_id`,
        aoColumnDefs: [
          { mData: 'e.engagement_id', bSearchable: true },
          { mData: 'd.name', bSearchable: true },
          { mData: 'u.user_name', bSearchable: true },
          { mData: 'e.pickup_location_address', bSearchable: true },
          { mData: 'e.drop_location_address', bSearchable: true },
        ],
      };

      let queryBuilder = new QueryBuilder(tableDefinition);
      let requestQuery = req.query;
      let queries = queryBuilder.buildQuery({
        ...requestQuery,
        order: [{ column: 0, dir: orderDirection }],
        columns: [{ name: 'e.engagement_id', orderable: 'true' }],
        start: parseInt(offset),
        length: parseInt(limit),
      });

      if (queries.length > 2) {
        queries = queries.splice(1);
      }

      queries.select = queries.select.replace('WHERE', ' AND ');
      queries.recordsTotal = queries.recordsTotal.replace('WHERE', ' AND ');
      queries.select = queries.select.replace(/NEW_CONDITION/g, ' WHERE ');
      queries.recordsTotal = queries.recordsTotal.replace(
        /NEW_CONDITION/g,
        ' WHERE ',
      );

      let all_data = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        queries.select,
        [cityId, Array.isArray(rideStatus[status])
          ? rideStatus[status].join(',')
          : rideStatus[status], operatorId, operatorId],
      );
      let user_count = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        queries.recordsTotal,
        [cityId, Array.isArray(rideStatus[status])
          ? rideStatus[status].join(',')
          : rideStatus[status], operatorId, operatorId],
      );

      for (let i = 0; i < all_data.length; i++) {
        let tempAddnInfo = all_data[i].addn_info;

        if (tempAddnInfo) {
          try {
            tempAddnInfo = JSON.parse(tempAddnInfo);
          } catch (e) {}
          tempAddnInfo.driver_name
            ? (all_data[i].driver_name = tempAddnInfo.driver_name)
            : 0;
        }
      }

      var response = {
        aaData: all_data,
        iTotalDisplayRecords: all_data.length,
        iTotalRecords: user_count[0]['COUNT(*)'],
      };
      return responseHandler.success(req, res, '', response);
    } else if (status == 12) {
      ridesQuery = `SELECT rps.description AS package_desc, rps.*,pd.*,eng.drop_location_address  FROM tb_requested_pkg_session as rps
			LEFT JOIN tb_delivery_packages as pd on ( pd.id = rps.package_id) LEFT JOIN tb_engagements as eng on ( eng.	engagement_id = rps.engagement_id) WHERE rps.engagement_id = ?`;

      values = [req.query.engagement_id];
      var result = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        ridesQuery,
        values,
      );

      var response = {
        aaData: result,
        iTotalDisplayRecords: result.length,
        iTotalRecords: result.length,
      };
      return responseHandler.success(req, res, '', response);
    } else {

      let all_data = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        ridesQuery,
        values,
      );
      ongoingQueryValues.splice(-2);
      let user_count = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        ongoingRideQuery,
        ongoingQueryValues,
      );
      replaceDriverName(all_data);
      return responseHandler.success(req, res, '', {
        result: all_data,
        iTotalRecords: user_count.length
      });
    }
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.dataAggregation = async function (req, res) {
  const requestBody = req.body;
  requestBody.operator_id = req.operator_id || req.body.operator_id;
  var requestRideType = req.request_ride_type;
  requestBody.request_ride_type = requestRideType;
  try {
    if (
      !requestBody.operator_id ||
      !requestBody.start_date ||
      !requestBody.end_date
    ) {
      const missingParams = [];
      if (!requestBody.operator_id) missingParams.push('operator_id');
      if (!requestBody.start_date) missingParams.push('start_date');
      if (!requestBody.end_date) missingParams.push('end_date');
      return responseHandler.parameterMissingResponse(res, missingParams);
    }

    const result = await Promise.all([
      Helper.getTripsData(requestBody),
      Helper.getDriversData(requestBody),
      Helper.getCustomersData(requestBody),
      Helper.getRideStatistics(requestBody),
      Helper.getActiveUsersData(requestBody),
    ]);

    return responseHandler.success(req, res, '', {
      trips: result[0],
      drivers: result[1],
      customers: result[2],
      ride_stats: result[3],
      active_users: result[4],
    });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.getScheduledRideDetails = async function (req, res) {
  let cityId = +req.query.city_id,
    regionId = +req.query.region_id,
    operatorId = req.operator_id || 1,
    vehicleType = -1,
    requestRideType = req.request_ride_type;

  delete req.query.token;
  delete req.query.domain_token;
  let orderDirection = req.query.sSortDir_0 || 'ASC';
  let status = req.query.status;
  let limit = Number(req.query.iDisplayLength || 50);
  let offset = Number(req.query.iDisplayStart || 0);
  let sSearch = req.query.sSearch;
  orderDirection = orderDirection.toUpperCase() == 'DESC' ? 'ASC' : 'ASC';
  let paramsWrapper = {};
  try {
    let schema = Joi.object({
      city_id: Joi.number().integer().optional(),
      region_id: Joi.number().integer().optional(),
      sSortDir_0: Joi.string().optional(),
      status: Joi.number().integer().optional(),
      iDisplayLength: Joi.number().integer().optional(),
      iDisplayStart: Joi.number().integer().optional(),
      sSearch: Joi.string().allow('').optional(),
      secret_key: Joi.number().optional(),
    });
    let result = schema.validate(req.query);

    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    if (regionId) {
      let checkOperator = `SELECT operator_id, vehicle_type FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} WHERE region_id = ? `;
      if (requestRideType == rideConstants.CLIENTS.MARS) {
        checkOperator += ` AND ride_type = ${rideConstants.CLIENTS_RIDE_TYPE.MARS}`;
      } else {
        checkOperator += ` AND ride_type = ${rideConstants.CLIENTS_RIDE_TYPE.VENUS_TAXI}`;
      }

      let operatorDetails = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        checkOperator,
        [regionId],
      );

      if (!operatorDetails || !operatorDetails.length) {
        throw new Error('No associated operator found.');
      }

      if (operatorDetails[0].operator_id != operatorId) {
        throw new Error('Invalid operator.');
      }
      regionId = [regionId];

      vehicleType = operatorDetails[0].vehicle_type;
    } else if (cityId) {
      let regionIdQuery = `SELECT region_id FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} WHERE operator_id = ? AND is_active = 1 AND city_id = ? `;
      if (requestRideType == rideConstants.CLIENTS.MARS) {
        regionIdQuery += ` AND ride_type = ${rideConstants.CLIENTS_RIDE_TYPE.MARS}`;
      } else {
        regionIdQuery += `AND ride_type = ${rideConstants.CLIENTS_RIDE_TYPE.VENUS_TAXI}`;
      }

      let regionResults = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        regionIdQuery,
        [operatorId, cityId],
      );

      regionId = [];

      for (let region of regionResults) {
        regionId.push(region.region_id);
      }
    }

    await getOperatorParameters(
      'schedule_cancel_window',
      operatorId,
      paramsWrapper,
    );

    let cancelWindowTime = paramsWrapper.schedule_cancel_window || 0;

		let resultt = await Helper.getScheduledRideDetailsHelper(regionId, cancelWindowTime, vehicleType,orderDirection,limit,offset,sSearch,status)

    return responseHandler.success(req, res, '', {
      result: resultt.scheduleRides,
      iTotalRecords: resultt.scheduleRidesCount.length,
    });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.getUnacceptedRideRequestUserDetails = async function (req, res) {
  try {
    var currentDate = moment().utc().format('YYYY-MM-DD');
    var startTime = currentDate + ' 00:00:00.000';
    var endTime = currentDate + ' 23:59:59.000';

    var taskType = req.query.task_type || 0,
      cityId = req.query.city_id,
      requestRideType = req.request_ride_type,
      startTime =
        req.query.start_time ||
        moment().utc().subtract(240, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      endTime =
        req.query.end_time || moment().utc().format('YYYY-MM-DD HH:mm:ss'),
      deliveryEnabled = +req.query.delivery_enabled || 0;

    delete req.query.token;

    var schema = Joi.object({
      city_id: Joi.required(),
      task_type: Joi.number().min(0).max(2).required(),
      start_time: Joi.date().optional(),
      end_time: Joi.date().optional(),
      delivery_enabled: Joi.number().min(0).max(1).optional(),
    }).unknown(true);

    var resultt = schema.validate(req.query);

    if (resultt.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    var operatorId = req.operator_id,
      fleetId = req.fleet_id;

    // cityId = cityId.toString();

    // cityId = cityId.join(',');
    let additionalJoin = '';
    let additionalSelect = '';
    // Add condition if request_ride_type is 2
    if (requestRideType == rideConstants.CLIENTS.MARS) {
      additionalJoin = `
						LEFT JOIN 
						${dbConstants.DBS.LIVE_DB}.tb_requested_pkg_session pks
						ON s.session_id = pks.session_id`;
      additionalSelect = `,pks.*`;
    }

    let missedRequestsQuery = `
    SELECT 
      s.request_latitude, 
      s.request_longitude, 
      group_concat(s.operator_accept_time + interval utc_offset minute) AS 'request_time', 
      u.user_id,
      eng.pickup_location_address,
      u.user_name,
      u.phone_no,
      eng.drop_location_address,
      group_concat(requested_drivers) AS requested_drivers, 
      count('request_time') AS 'request_count',
      u.user_image AS customer_image,
      u.date_registered AS customer_register_date,
      u.user_email AS customer_email,
      u.last_login AS customer_last_login,
      u.total_rides_as_user,
      u.total_rating_user,
      u.last_ride_on AS customer_last_ride,				
      s.city,
      eng.engagement_id,
      eng.pickup_latitude,
      eng.pickup_longitude,
      eng.vehicle_type
      ${additionalSelect} -- Add the conditional select
    FROM  
      ${dbConstants.DBS.LIVE_DB}.tb_session s
    LEFT JOIN 
      ${dbConstants.DBS.LIVE_DB}.tb_cities c ON s.city=c.city_id
    LEFT JOIN 
      ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} u ON s.user_id=u.user_id
    LEFT JOIN 
       ${dbConstants.DBS.LIVE_DB}.tb_engagements eng ON s.session_id=eng.session_id
     
    ${additionalJoin}  -- Add the conditional join
      
    WHERE  
      s.operator_accept_time + INTERVAL utc_offset MINUTE >= NOW() - INTERVAL 1 DAY
              AND 
      s.city IN (?) AND 
      s.is_active!=1 AND 
      ride_acceptance_flag = 0 AND
      s.service_type = ? AND
      requested_drivers>0 
    GROUP BY u.user_id
    ORDER BY 
      s.session_id desc`;

    let missedRequests = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      missedRequestsQuery,
      [cityId, requestRideType],
    );
    let timeoutRequestsQuery = `
    SELECT 
      request_latitude, 
      request_longitude, 
      group_concat(s.operator_accept_time + interval utc_offset minute) AS 'request_time', 
      u.user_id, 
      eng.pickup_location_address,
      (requested_drivers) AS requested_drivers, 
      u.user_name,
      eng.drop_location_address,
      u.phone_no,
      count('request_time') AS 'request_count',
      u.user_image AS customer_image,
      s.city,
      eng.engagement_id,
      eng.pickup_latitude,
      eng.pickup_longitude,
      eng.vehicle_type
    FROM  
      ${dbConstants.DBS.LIVE_DB}.tb_session s
    LEFT JOIN 
      ${dbConstants.DBS.LIVE_DB}.tb_cities c ON s.city=c.city_id
    LEFT JOIN 
      ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} u ON s.user_id=u.user_id
    LEFT JOIN 
        ${dbConstants.DBS.LIVE_DB}.tb_engagements eng ON s.session_id=eng.session_id
    WHERE  
      s.operator_accept_time + INTERVAL utc_offset MINUTE >= NOW() - INTERVAL 1 DAY
              AND s.city IN (?) AND s.is_active!=1 AND ride_acceptance_flag = 0  AND s.requested_drivers=0 AND s.service_type = ?
    GROUP BY u.user_id
    ORDER BY 
      s.session_id desc`;

    let timeoutRequests = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      timeoutRequestsQuery,
      [cityId, requestRideType],
    );

    var resObj = {
      missed_requests: missedRequests ? missedRequests : [],
      timeout_requests: timeoutRequests ? timeoutRequests : [],
    };

    var queryRides = Helper.getTaskDetailsQueryHelper(
      deliveryEnabled,
      taskType,
      fleetId,
      requestRideType,
    );

    let result = await db.RunQuery(dbConstants.DBS.LIVE_DB, queryRides, [
      startTime,
      endTime,
      operatorId,
      cityId,
      requestRideType,
    ]);

    if (deliveryEnabled) {
      var finalResult = [],
        dropDetailsMappingToSession = {},
        taskMappingToSession = {};

      for (var i in result) {
        if (!dropDetailsMappingToSession[result[i].session_id]) {
          dropDetailsMappingToSession[result[i].session_id] = [];
          taskMappingToSession[result[i].session_id] = result[i];
        }

        var tempDropData = {};

        tempDropData['lat'] = result[i].latitude;
        tempDropData['long'] = result[i].longitude;
        tempDropData['address'] = result[i].address;
        dropDetailsMappingToSession[result[i].session_id].push(tempDropData);

        delete result[i].latitude;
        delete result[i].longitude;
      }

      for (var i in dropDetailsMappingToSession) {
        var dropData = dropDetailsMappingToSession[i];
        var data = taskMappingToSession[i];

        data['drop_data'] = dropData;

        finalResult.push(data);

        finalResult['vehicle_name'] = result[i].vehicle_name;
      }

      resObj.assigned_data = finalResult;

      return resObj;
    }
    // here taskType 1 stands for ongoing ride

    if (taskType == 1 && result.length) {
      var engagementIds = [];
      var emergencyRidesEngagementIds = [];

      for (var i in result) {
        engagementIds.push(result[i].engagement_id);
      }

      var getEmergencyRidesQuery = `
				SELECT 
					engagement_id, alert_initiated_by 
				FROM 
					${dbConstants.DBS.AUTH_DB}.tb_emergency_alerts 
				WHERE 
					engagement_id IN (?) AND status = 1`;

      let emergencyRides = await db.RunQuery(
        dbConstants.DBS.AUTH_DB,
        getEmergencyRidesQuery,
        [engagementIds.join(',')],
      );

      for (var i in emergencyRides) {
        // 1 for customer 2 for driver
        // [In autos DB 0 is stored for customer and 1 for driver, whereas in SM constants 1 is for customer and 2 is for driver]
        // And 3 for both ( i.e. both driver and customer have enabled sos)

        if (emergencyRidesEngagementIds[emergencyRides[i].engagement_id]) {
          emergencyRidesEngagementIds[emergencyRides[i].engagement_id] +=
            emergencyRides[i].alert_initiated_by + 1;
        } else {
          emergencyRidesEngagementIds[emergencyRides[i].engagement_id] =
            emergencyRides[i].alert_initiated_by + 1;
        }
      }

      for (var i in result) {
        result[i].is_emergency_enabled =
          emergencyRidesEngagementIds[result[i].engagement_id] || 0;
      }
    }

    resObj.assigned_data = result;

    return responseHandler.success(
      req,
      res,
      'Data fetched successfully',
      resObj,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.getEngagementInfo = async function (req, res) {
  try {
    let requestParameters = req.body;
    let operatorId = req.operator_id;
    let engagementId = requestParameters.engagement_id;
    if (Helper.checkBlank([engagementId])) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    let data = await Helper.engagementInfofetcher(engagementId, operatorId);

    if (data[0].master_coupon == 1) {
      data[0].coupon_title = data[0].integratedPromoTitle;
    }
    data[0].engagement_title = 3; // To display completed ride as default
    let statusString = [
      'Ended from Panel',
      'Start-End Case',
      'Cancelled Ride',
      'Completed Ride',
      'Completed(Pool) Ride',
      'Ongoing Ride',
      'Start-End Reversed Case',
    ];
    if (data[0].start_end_reversed == 1) {
      data[0].engagement_title = 6;
    } else if (data[0].end_ride == 1) {
      data[0].engagement_title = 0; // To indicate ride ended from panel
    } else if (data[0].start_end == 1) {
      data[0].engagement_title = 1; // To indicate that ride was a start-end case
    } else if (
      data[0].engagement_status == 8 ||
      data[0].engagement_status == 13
    ) {
      data[0].engagement_title = 2; // To indicate ride was a cancelled ride
    } else if (data[0].ride_type_status == 2) {
      // To indicate ride was a pool ride
      data[0].engagement_title = 4;
    } else if (
      data[0].engagement_status == 2 ||
      data[0].engagement_status == 1
    ) {
      data[0].engagement_title = 5;
    } else {
      data[0].engagement_title = 3;
    }
    data[0].engagement_title_string = statusString[data[0].engagement_title];

    var customerWaitTimeFare = Helper.calculateWaitTimeFare(
      data[0].wait_time,
      data[0].waiting_charges_applicable,
      data[0].customer_fare_threshold_waiting_time,
      data[0].customer_fare_per_waiting_min,
      data[0].customer_fare_factor,
    );

    var driverWaitTimeFare = Helper.calculateWaitTimeFare(
      data[0].wait_time,
      data[0].waiting_charges_applicable,
      data[0].driver_fare_threshold_waiting_time,
      data[0].driver_fare_per_waiting_min,
      data[0].driver_fare_factor,
    );

    const waitFare = {
      customerWaitTimeFare,
      driverWaitTimeFare,
    };
    return responseHandler.success(
      req,
      res,
      'Engagement info fetched successfully',
      {
        waitFare: waitFare,
        data: data[0],
      },
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

function replaceDriverName(rides) {
  rides.forEach((ride) => {
    if (ride.addn_info) {
      let addnInfo = JSON.parse(ride.addn_info);
      addnInfo.driver_name ? (ride.driver_name = addnInfo.driver_name) : null;
    }
  });
}
