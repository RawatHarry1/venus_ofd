const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const documentsConstant = require('../../../constants/document');
const rideHelper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');

exports.getCaptains = async function (req, res) {
  try {
    var reqParams = req.query;
    var city = reqParams.city;
    var requestRideType = req.request_ride_type;
    var vehicleType = reqParams.vehicle_type;
    var category = reqParams.category;
    var operatorId = req.operator_id;
    var fleetId = req.fleet_id;
    let orderDirection = reqParams.sSortDir_0 || 'DESC';
    let limit = Number(req.query.iDisplayLength || 50);
    let offset = Number(req.query.iDisplayStart || 0);
    let sSearch = req.query.sSearch;
    orderDirection = orderDirection.toUpperCase() == 'ASC' ? 'ASC' : 'DESC';
    let whereClause = [],
      values = [];

    whereClause.push('GLOBAL.operator_id = ? ');
    values.push(operatorId);

    whereClause.push('GLOBAL.city_id = ? ');
    values.push(city);

    whereClause.push('GLOBAL.driver_suspended = ? ');
    values.push(0);

    whereClause.push('GLOBAL.verification_status = ? ');
    values.push(documentsConstant.ENROLLED_DOC_STATUS.VERIFIED);
    whereClause.push('live_users.can_request = 1 ');

    whereClause.push(
      '( ( ( DATEDIFF(NOW(), GLOBAL.date_registered)>= 7 ' +
        'AND post_doc_status = 1 ) ) OR ( DATEDIFF(NOW(), GLOBAL.date_registered)< 7 ' +
        'AND post_doc_status IN (0,1) ) ) ',
    );

    if (vehicleType > 0) {
      whereClause.push('GLOBAL.vehicle_type = ? ');
      values.push(vehicleType);
    }
    if (requestRideType) {
      whereClause.push('GLOBAL.service_type = ? ');
      values.push(requestRideType);
    }

    if (fleetId) {
      whereClause.push('fleet_id IN (?) ');
      values.push(fleetId);
    }

    if (sSearch) {
      whereClause.push('GLOBAL.name LIKE ? OR GLOBAL.phone_no LIKE ? ');
      values.push(`%${sSearch}%`, `%${sSearch}%`);
    }

    whereClause.push('live_users.can_request = 1 ');

    if (whereClause.length) {
      whereClause = ' ' + whereClause.join(' AND ');
    } else {
      whereClause = '';
    }

    var getDriver = ` ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS}  AS GLOBAL
          LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.FLEET}  AS fleet
          ON
              fleet.id = GLOBAL.fleet_id
          LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}  AS live_users ON live_users.user_id = GLOBAL.driver_id
          LEFT JOIN(
              SELECT
                  COUNT(
                      CASE WHEN(
                          (
                              COALESCE(
                                  DATEDIFF(NOW(), engagement_date),
                                  0) <= 7
                              ) AND(
                                  COALESCE(
                                      DATEDIFF(NOW(), engagement_date),
                                      0) > 0
                                  )
                              ) THEN 1 ELSE 0
                          END
                      ) last_seven_days,
                      COUNT(
                          CASE WHEN(
                              (
                                  COALESCE(
                                      DATEDIFF(NOW(), engagement_date),
                                      0) <= 30
                                  ) AND(
                                      COALESCE(
                                          DATEDIFF(NOW(), engagement_date),
                                          0) > 0
                                      )
                                  ) THEN 1 ELSE 0
                              END
                          ) last_thirty_days,
                          tb_engagements.driver_id
                      FROM
                          ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES} 
                      WHERE
                  STATUS
                      = 3
                  GROUP BY
                      tb_engagements.driver_id
                      ) eng
                  ON
                      eng.driver_id = GLOBAL.driver_id`;

    let tableDefinition = {
      sSelectSql: `GLOBAL
                      .driver_id,
                      GLOBAL.name as driver_name,
                      fleet.name as fleet_name,
                      GLOBAL.city_id as city,
                      GLOBAL.phone_no,
                      GLOBAL.service_type,
                      GLOBAL.email,
                      UNIX_TIMESTAMP(GLOBAL.date_of_birth) AS date_of_birth,
                      UNIX_TIMESTAMP(COALESCE(GLOBAL.date_first_activated, GLOBAL.date_registered)) AS date_reg,
                      (
                          CASE WHEN(
                              (
                                  GLOBAL.current_latitude = 0 AND GLOBAL.current_longitude = 0
                              ) OR GLOBAL.autos_available = 0
                          ) THEN 0 ELSE 1
                      END
                  ) AS is_online,
                  vehicle_no AS vehicle_number,
                  last_seven_days,
                  last_thirty_days,
                  UNIX_TIMESTAMP(GLOBAL.last_login) AS last_login,
                  UNIX_TIMESTAMP(GLOBAL.last_ride_on) AS last_ride_on,
                  (
                      CASE WHEN num_ratings_received > 0 THEN ROUND(
                          (
                              (total_ratings) /(num_ratings_received)
                          ),
                          2
                      ) ELSE 0
                  END
                  ) AS avg_ratings,
                  GLOBAL.vehicle_type,
                  UNIX_TIMESTAMP(COALESCE(GLOBAL.date_first_activated, GLOBAL.date_registered)) as date_registered`,

      sFromSql: getDriver,
      sWhereAndSql: whereClause,
      sCountColumnName: `global.driver_id`,

      aoColumnDefs: [
        {
          mData: 'GLOBAL.driver_id',
          bSearchable: true,
          bSortable: true,
          orderable: true,
        },
        {
          mData: 'GLOBAL.name',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'fleet.name',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'city',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'GLOBAL.phone_no',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'email',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'GLOBAL.date_of_birth',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'is_online',
          bSortable: true,
        },
        {
          mData: 'date_reg',
          bSortable: true,
        },
        {
          mData: 'vehicle_no',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'last_seven_days',
          bSortable: true,
        },
        {
          mData: 'last_thirty_days',
          bSortable: true,
        },
        {
          mData: 'GLOBAL.last_login',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'GLOBAL.last_ride_on',
          bSearchable: true,
          bSortable: true,
        },
        {
          mData: 'avg_ratings',
          bSortable: true,
        },
        {
          mData: 'vehicle_type',
          bSortable: true,
        },
        {
          mData: 'GLOBAL.date_registered',
          bSearchable: true,
          bSortable: true,
        },
      ],
    };

    let queryBuilder = new QueryBuilder(tableDefinition);
    let requestQuery = req.query;

    let queries = queryBuilder.buildQuery({
      ...requestQuery,
      order: [{ column: 0, dir: orderDirection }],
      columns: [{ name: 'GLOBAL.driver_id', orderable: 'true' }],
      start: offset,
      length: limit,
    });

    if (queries.length > 2) {
      queries = queries.splice(1);
    }

    let driverDetails = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queries.select,
      values,
    );
    let user_count = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queries.recordsTotal,
      values,
    );

    let response = {
      aaData: driverDetails,
      iTotalDisplayRecords: driverDetails.length,
      iTotalRecords: user_count[0]['COUNT(*)'],
    };
    return responseHandler.success(req, res, 'User Details Sents', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
