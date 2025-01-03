const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const documentsConstant = require('../../../constants/document');
const Helper = require('../helper')
const globalHelper = require('../globalHelper')
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

exports.getCaptionsDetails = async function (req, res) {
  try {
    var
      operatorId = req.operator_id,
      deliveryEnabled = +req.query.delivery_enabled || 0,
      status = req.query.status,
      cityId = req.query.city_id,
      vehicleType = req.query.vehicle_type,
      requestRideType = req.request_ride_type,
      fleetId = req.fleet_id;

    delete req.query.token;

    var schema = Joi.object({
      city_id: Joi.required(),
      status: Joi.number().min(0).max(5).required(),
      vehicle_type: Joi.number().optional(),
      delivery_enabled: Joi.number().min(0).max(1).optional(),
      request_fleet_id: Joi.number().optional(),
      secret_key: Joi.number().optional()
    }).unknown(true);;

    var result = schema.validate(req.query);

    if(Array.isArray(cityId) && cityId.length){
      cityId = cityId.toString().join(',');
    }

    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    };

    if (!fleetId) {
      fleetId = req.query.request_fleet_id;
    }

    var fetchDriverDetails = Helper.getLimitedDriverDetailsQueryHelper(deliveryEnabled, status, vehicleType, fleetId, cityId, requestRideType);

    var values = [operatorId, requestRideType, cityId];

    if (vehicleType) {
      values.push(vehicleType);
    }
    if (fleetId) {
      values.push(fleetId);
    }
    let drivers = await db.RunQuery(dbConstants.DBS.LIVE_DB, fetchDriverDetails, values);
    return responseHandler.success(req, res, 'Data fetched successfully.', drivers);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
}

exports.getDriverInfo = async function (req, res) {
  var response = {};
  try {
    var requestParameters = req.body;
    var driverId = requestParameters.driver_id;
    var start_from_rides = parseInt(requestParameters.paginationDetails.start_from_rides) || 0;
    var page_size_rides = parseInt(requestParameters.paginationDetails.page_size_rides) || 0;
    var start_from_issues = parseInt(requestParameters.paginationDetails.start_from_issues) || 0;
    var page_size_issues = parseInt(requestParameters.paginationDetails.page_size_issues) || 0;
    var start_from_can_rides = parseInt(requestParameters.paginationDetails.start_from_can_rides) || 0;
    var page_size_can_rides = parseInt(requestParameters.paginationDetails.page_size_can_rides) || 0;
    var start_from_agent_history = parseInt(requestParameters.paginationDetails.start_from_agent_history) || 0;
    var page_size_agent_history = parseInt(requestParameters.paginationDetails.page_size_agent_history) || 0;
    var start_from_dodo = parseInt(requestParameters.paginationDetails.start_from_dodo) || 0;
    var page_size_dodo = parseInt(requestParameters.paginationDetails.page_size_dodo) || 10;
    var start_from_app_issue = parseInt(requestParameters.paginationDetails.start_from_app_issues) || 0;
    var page_size_app_issue = parseInt(requestParameters.paginationDetails.page_size_app_issues) || 10;
    var dataDateLimit = new Date();
    var token = requestParameters.token;
    dataDateLimit.setDate(dataDateLimit.getDate() - 7);
    dataDateLimit = dataDateLimit.toISOString();
    var responseData = {};
    var ongoingRide = [];
    var issues = [];
    var appIssues = [];
    var cancelledRides = [];
    var friends = [];
    var callHistory = [];
    var bankDetails = [];
    var startEndCount = [];
    var yellow = [];
    var red = [];
    var dodoDeliveries = [];
    var firstLogin = [];
    responseData.ongoingRide = ongoingRide;
    responseData.issues = issues;
    responseData.appIssues = appIssues;
    responseData.cancelled_rides = cancelledRides;
    var isDriver = 1;
    var asyncTasks = [];
    var finalWalletBalance = [];


    await globalHelper.getDriverRides(driverId, start_from_rides, page_size_rides, responseData);
    await globalHelper.getDriverPerformance(driverId, responseData);
    await globalHelper.getOngoingRideForDriver(driverId, ongoingRide);
    // await globalHelper.getIssuesForDriver(driverId, issues, start_from_issues, page_size_issues);
    // await globalHelper.getInAppIssuesForDriver(driverId, appIssues, start_from_app_issue, page_size_app_issue);
    await globalHelper.getCancelledRides(driverId, cancelledRides, start_from_can_rides, page_size_can_rides, 2);
    await globalHelper.get_friends_details(driverId, friends);
    // await globalHelper.getDriverCallHistory(driverId, callHistory, start_from_agent_history, page_size_agent_history);
    // await globalHelper.getDriverToDriverReferrals(driverId, friends);
    // await globalHelper.getDriverBankDetails(driverId, bankDetails);
    // await globalHelper.getStartEndCasesCount(driverId, startEndCount, isDriver);
    // await globalHelper.getDriverStarsCount(driverId, yellow, red);

    await globalHelper.getTodaysFirstLogin(driverId, firstLogin);
    // await globalHelper.getFaultyRidesForDriver(driverId, responseData);

    // await globalHelper.getWalletBalance(driverId, responseData);
    // await globalHelper.getDriverNotes(driverId, responseData);
    await globalHelper.getDriverCityInfo(driverId, responseData);


    var friendsArr = [];
    var hashMap = {}
    for(var i = 0 in friends){
        if(!hashMap[friends[i].user_id]){
            hashMap[friends[i].user_id] = {
                user_id : friends[i].user_id,
                user_name : friends[i].user_name,
                user_email : friends[i].user_email,
                phone_no : friends[i].phone_no,
                verification_status :friends[i].verification_status,
                first_transaction_on : friends[i].first_transaction_on,
                date_registered: friends[i].date_registered,
                is_duplicate : friends[i].is_duplicate,
                failed_reason : friends[i].failed_reason,
                type: friends[i].type
            }
        }
      hashMap[friends[i].user_id].type = friends[i].type;
    }
    for (var j in hashMap) {
      friendsArr.push(hashMap[j]);
    }
    responseData.yellowStars = yellow[0];
    responseData.redStars = red[0];
    responseData.start_end_count = startEndCount[0];
    responseData.call_history = callHistory[0];
    responseData.detailsCount = exports.driverInfoCount;
    responseData.bankDetails = bankDetails;
    responseData.dodo = dodoDeliveries;
    responseData.todays_first_login = firstLogin[0];
    responseData.friends = friendsArr;
    return responseHandler.success(req, res, 'Driver Info Sents', responseData);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }

}



exports.getAvilableDrivers = async function (req, res) {

  try {
    var
      deliveryEnabled = +req.query.delivery_enabled || 0,
      cityId = req.query.city_id,
      vehicleType = req.query.vehicle_type
    fleetId = 0

    let data = []

    var schema = Joi.object({
      city_id: Joi.required(),
      vehicle_type: Joi.number().optional(),
      delivery_enabled: Joi.number().min(0).max(1).optional(),
      request_fleet_id: Joi.number().optional()
    }).unknown(true);;

    var result = schema.validate(req.query);
    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    if (!fleetId) {
      fleetId = req.query.request_fleet_id;
    }

    var query = `SELECT
        dr.name,
        dr.driver_id,
        dr.phone_no,
        dr.driver_image,
        dr.last_ride_on,
        dr.date_of_birth,
        dr.location_updated_at,
        CASE WHEN ABS(dr.current_latitude) > 0.001 THEN dr.current_latitude ELSE dr.last_latitude END as current_latitude,
        CASE WHEN ABS(dr.current_longitude) > 0.001 THEN dr.current_longitude ELSE dr.last_longitude END as current_longitude
        FROM
          ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} dr
        WHERE
            dr.operator_id = ?
            AND dr.city_id IN (?)
            AND dr.driver_suspended = 0
            AND dr.status = 0
            AND dr.current_latitude != 0
            AND dr.current_longitude != 0
            AND dr.autos_enabled = 1
            AND dr.autos_available = 1
            AND dr.location_updated_at >= (NOW() - INTERVAL 10 MINUTE)
            AND dr.vehicle_type = ?`


    data = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      query,
      [req.operator_id, cityId, vehicleType],
    );

    return responseHandler.success(req, res, 'Data fetched successfully.', data);


  } catch (error) {
    errorHandler.errorHandler(error, req, res);


  }
}
