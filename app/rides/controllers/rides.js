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
    var values = [cityId, rideStatus[status].join(','), operatorId, operatorId];

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
      var result = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        ridesQuery,
        values,
      );
      var resultCount = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        ongoingRideQuery,
        ongoingQueryValues,
      );
      replaceDriverName(result);

      return {
        result: result,
        iTotalRecords: resultCount,
      };
    }
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
