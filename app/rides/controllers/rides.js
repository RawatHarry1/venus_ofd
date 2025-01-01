const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const Helper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');
const { getOperatorParameters } = require('../../admin/helper');

exports.getRides = async function (req, res) {
  try {
    let {
      city_id: cityId,
      status,
      vehicle_type: vehicleType,
      fleet_id: fleetId,
      request_ride_type: requestRideType,
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
    var values = [cityId, Array.isArray(rideStatus[status]) ? rideStatus[status].join(',') : rideStatus[status], operatorId, operatorId];

    if (status == rideConstant.DASHBOARD_RIDE_STATUS.ONGOING) {
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
      if (req.query.start_date && req.query.end_date) {
        get_data += `  AND e.request_made_on BETWEEN '${req.query.start_date}' AND '${req.query.end_date}'  `;
      }
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
        start: offset,
        length: limit,
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
        values,
      );
      let user_count = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        queries.recordsTotal,
        values,
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
    } else if (status == rideConstant.DASHBOARD_RIDE_STATUS.MISSED) {
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
        start: offset,
        length: limit,
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
        values,
      );
      let user_count = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        queries.recordsTotal,
        values,
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
      var valueToBePicked = ` 
      e.pickup_location_address,
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
      s.service_type,
      s.op_drop_longitude AS drop_longitude,
      s.op_drop_latitude AS drop_latitude,
      e.vehicle_type,
      e.city,
      e.ride_time,
e.distance_travelled,
d.current_latitude,
d.current_longitude,
      s.cancellation_reasons`;

      var valueToBePickedFrom = `
  venus_live.tb_engagements e
  
  JOIN venus_live.tb_users u ON e.user_id = u.user_id
  
  JOIN venus_live.tb_drivers d ON e.driver_id = d.driver_id

  JOIN venus_live.tb_session s ON e.session_id = s.session_id
  `;

      if (status == rideConstants.DASHBOARD_RIDE_STATUS.CANCELLED_REQUESTS || status == rideConstants.DASHBOARD_RIDE_STATUS.CANCELLED_RIDES) {

        valueToBePickedFrom += ` LEFT JOIN (SELECT * FROM venus_live.tb_nts_booking_info GROUP BY engagement_id) nts ON e.session_id = nts.session_id `;

      } else {

        valueToBePickedFrom += ` LEFT JOIN (SELECT * FROM venus_live.tb_nts_booking_info WHERE is_vehicle_assigned = 1 ) nts ON e.session_id = nts.session_id `;
      }

      valueToBePickedFrom += `  NEW_CONDITION e.city = ? AND 
      e.status IN (?) AND 
      d.operator_id = ? AND 
      u.operator_id = ? AND
      e.request_made_on >= NOW() - INTERVAL 24 HOUR`

//       if (corporateId) {

//         valueToBePickedFrom += `
// JOIN venus_live.tb_business_users bu ON bu.business_id = s.is_manual 
// `;

//         valueToBePicked += ', bu.external_id AS corporate_id ';

//       }

      // if (driverId) {

      //   valueToBePicked += ', d.driver_id, (e.actual_fare - e.venus_commission) AS driver_earnings,s.preferred_payment_mode ';
      // }

      if (fleetId) {

        valueToBePicked += ', d.driver_id, d.external_id AS fleet_id, (e.actual_fare - e.venus_commission) AS driver_earnings, s.preferred_payment_mode  ';
      }
  let tableDefinition = {
    sSelectSql: valueToBePicked,
    sFromSql: valueToBePickedFrom,
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
        start: offset,
        length: limit,
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
        values,
      );
      let user_count = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        queries.recordsTotal,
        values,
      );
      replaceDriverName(all_data);
      return responseHandler.success(req, res, '', {
        result: all_data,
        iTotalRecords: user_count[0]['COUNT(*)'],
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
  let 
  cityId = +req.query.city_id,
  regionId = +req.query.region_id,
  operatorId = req.operator_id || 1,
  vehicleType = -1,
  requestRideType = req.request_ride_type;

  delete req.query.token;
	delete req.query.domain_token;
	let orderDirection   = req.query.sSortDir_0 || "ASC"
	let status = req.query.status
	let limit = Number(req.query.iDisplayLength || 50);
	let offset = Number((req.query.iDisplayStart) || 0);
	let sSearch = req.query.sSearch
	orderDirection = (orderDirection.toUpperCase() == 'DESC') ? 'ASC' : 'ASC';
  let paramsWrapper = {}
  try {

    let schema = Joi.object({
      city_id: Joi.number().integer().optional(),
      region_id: Joi.number().integer().optional(),
      sSortDir_0: Joi.string().optional(),
      status:Joi.number().integer().optional(),
      iDisplayLength: Joi.number().integer().optional(),
      iDisplayStart: Joi.number().integer().optional(),
      sSearch: Joi.string().allow("").optional(),
      secret_key: Joi.number().optional()
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

      let operatorDetails =  await db.RunQuery(dbConstants.DBS.LIVE_DB, checkOperator, [regionId]);

			if (!operatorDetails || !operatorDetails.length) {
				throw new Error('No associated operator found.');
			}

			if (operatorDetails[0].operator_id != operatorId) {
				throw new Error('Invalid operator.');
			}
			regionId = [regionId];

			vehicleType = operatorDetails[0].vehicle_type;
		}

		else if (cityId) {

			let regionIdQuery = `SELECT region_id FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} WHERE operator_id = ? AND is_active = 1 AND city_id = ? `;
			if (requestRideType == rideConstants.CLIENTS.MARS) {
				regionIdQuery +=  ` AND ride_type = ${rideConstants.CLIENTS_RIDE_TYPE.MARS}`;
			} else {
				regionIdQuery +=  `AND ride_type = ${rideConstants.CLIENTS_RIDE_TYPE.VENUS_TAXI}`;
			}

      let regionResults = await db.RunQuery(dbConstants.DBS.LIVE_DB, regionIdQuery, [operatorId, cityId]);

			regionId = [];

			for (let region of regionResults) {
				regionId.push(region.region_id);
			}
		}

    await getOperatorParameters( 'schedule_cancel_window', operatorId, paramsWrapper)

		let cancelWindowTime = paramsWrapper.schedule_cancel_window || 0;

    var valueToBePicked = ` 
    sc.pickup_id, 
				sc.latitude, 
				sc.longitude, 
				sc.op_drop_latitude,
				sc.op_drop_longitude, 
				sc.preferred_payment_mode, 
				sc.pickup_location_address, 
				sc.drop_location_address,
				sc.pickup_time, 
				sc.status, 
				sc.region_id, 
				sc.customer_note, 
				sc.driver_to_engage,
				sc.user_id,
				CASE WHEN (sc.pickup_time > NOW() + INTERVAL ? MINUTE AND sc.status = 0) THEN 1
				ELSE 0 END AS modifiable, 
				u.user_name, 
				u.phone_no,
				cr.vehicle_type,
				cr.city_id,
				0 AS is_vip`



    var valueToBePickedFrom = `
			  venus_live.tb_schedules sc 
			JOIN 
				venus_live.tb_users u ON u.user_id = sc.user_id
			JOIN 
				venus_live.tb_city_sub_regions cr ON cr.region_id = sc.region_id
`;


    valueToBePickedFrom += `  NEW_CONDITION sc.region_id in (?) AND 
				sc.pickup_time > NOW() - INTERVAL 4 HOUR`

    if (sSearch) {
      valueToBePickedFrom += ` AND sc.user_id LIKE '%${sSearch}%'`;
    }
    if(status){
			valueToBePickedFrom += ` AND sc.status = ${status}`
		}
    regionId = regionId.join(',')

    let values = [cancelWindowTime, regionId];


        let tableDefinition = {
          sSelectSql: valueToBePicked,
          sFromSql: valueToBePickedFrom,
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
              columns: [{ name: 'sc.pickup_time', orderable: 'true' }],
              start: offset,
              length: limit,
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
              values,
            );
            let user_count = await db.RunQuery(
              dbConstants.DBS.LIVE_DB,
              queries.recordsTotal,
              [regionId],
            );
            console.log("user_count",user_count);

    return responseHandler.success(req, res, '', {
      result: all_data,
      iTotalRecords: user_count[0]['COUNT(*)'],
    });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};


exports.getUnacceptedRideRequestUserDetails = async function (req, res) {
  try {
    return responseHandler.success(req, res, 'Rides fetched successfully', '');
    
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
}

exports.getEngagementInfo = async function (req, res) {
  try {
    let requestParameters = req.body;
    let operatorId = req.operator_id;
    let engagementId = requestParameters.engagement_id;
    if(Helper.checkBlank([engagementId])){
      return responseHandler.parameterMissingResponse(res, '');
    }

    let data = await Helper.engagementInfofetcher(engagementId, operatorId);

    if (data[0].master_coupon == 1) {
      data[0].coupon_title = data[0].integratedPromoTitle;
    }
    data[0].engagement_title = 3;     // To display completed ride as default
    let statusString = ["Ended from Panel", "Start-End Case", "Cancelled Ride", "Completed Ride",
      "Completed(Pool) Ride", "Ongoing Ride", "Start-End Reversed Case"];
    if (data[0].start_end_reversed == 1) {
      data[0].engagement_title = 6;
    }
    else if (data[0].end_ride == 1) {
      data[0].engagement_title = 0; // To indicate ride ended from panel
    }
    else if (data[0].start_end == 1) {
      data[0].engagement_title = 1; // To indicate that ride was a start-end case
    }
    else if (data[0].engagement_status == 8 || data[0].engagement_status == 13) {
      data[0].engagement_title = 2; // To indicate ride was a cancelled ride
    }
    else if (data[0].ride_type_status == 2) { // To indicate ride was a pool ride
      data[0].engagement_title = 4;
    }
    else if (data[0].engagement_status == 2 || data[0].engagement_status == 1) {
      data[0].engagement_title = 5;
    }
    else {
      data[0].engagement_title = 3;
    }
    data[0].engagement_title_string = statusString[data[0].engagement_title];

    var customerWaitTimeFare = Helper.calculateWaitTimeFare(data[0].wait_time,
      data[0].waiting_charges_applicable, data[0].customer_fare_threshold_waiting_time,
      data[0].customer_fare_per_waiting_min, data[0].customer_fare_factor);


      var driverWaitTimeFare = Helper.calculateWaitTimeFare(data[0].wait_time,
      data[0].waiting_charges_applicable, data[0].driver_fare_threshold_waiting_time,
      data[0].driver_fare_per_waiting_min, data[0].driver_fare_factor);

      const waitFare = {
          customerWaitTimeFare,driverWaitTimeFare
      }
    return responseHandler.success(req, res, 'Engagement info fetched successfully', {
      waitFare: waitFare,
      data: data[0]
    });
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
