const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const documentsConstant = require('../../../constants/document');
const Helper = require('../helper');
const globalHelper = require('../globalHelper');
var Joi = require('joi');
var QueryBuilder = require('datatable');
const { checkBlank } = require('../../rides/helper');
const { getOperatorParameters } = require('../../admin/helper');

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
    var operatorId = req.operator_id,
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
      secret_key: Joi.number().optional(),
    }).unknown(true);

    var result = schema.validate(req.query);

    if (Array.isArray(cityId) && cityId.length) {
      cityId = cityId.toString().join(',');
    }

    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    if (!fleetId) {
      fleetId = req.query.request_fleet_id;
    }

    var fetchDriverDetails = Helper.getLimitedDriverDetailsQueryHelper(
      deliveryEnabled,
      status,
      vehicleType,
      fleetId,
      cityId,
      requestRideType,
    );

    var values = [operatorId, requestRideType, cityId];

    if (parseInt(vehicleType)) {
      values.push(vehicleType);
    }
    if (fleetId) {
      values.push(fleetId);
    }
    let drivers = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      fetchDriverDetails,
      values,
    );
    return responseHandler.success(
      req,
      res,
      'Data fetched successfully.',
      drivers,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.getDriverInfo = async function (req, res) {
  var response = {};
  try {
    var requestParameters = req.body;
    var driverId = requestParameters.driver_id;
    var start_from_rides =
      parseInt(requestParameters.paginationDetails.start_from_rides) || 0;
    var page_size_rides =
      parseInt(requestParameters.paginationDetails.page_size_rides) || 0;
    var start_from_issues =
      parseInt(requestParameters.paginationDetails.start_from_issues) || 0;
    var page_size_issues =
      parseInt(requestParameters.paginationDetails.page_size_issues) || 0;
    var start_from_can_rides =
      parseInt(requestParameters.paginationDetails.start_from_can_rides) || 0;
    var page_size_can_rides =
      parseInt(requestParameters.paginationDetails.page_size_can_rides) || 0;
    var start_from_agent_history =
      parseInt(requestParameters.paginationDetails.start_from_agent_history) ||
      0;
    var page_size_agent_history =
      parseInt(requestParameters.paginationDetails.page_size_agent_history) ||
      0;
    var start_from_dodo =
      parseInt(requestParameters.paginationDetails.start_from_dodo) || 0;
    var page_size_dodo =
      parseInt(requestParameters.paginationDetails.page_size_dodo) || 10;
    var start_from_app_issue =
      parseInt(requestParameters.paginationDetails.start_from_app_issues) || 0;
    var page_size_app_issue =
      parseInt(requestParameters.paginationDetails.page_size_app_issues) || 10;
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

    await globalHelper.getDriverRides(
      driverId,
      start_from_rides,
      page_size_rides,
      responseData,
    );
    await globalHelper.getDriverPerformance(driverId, responseData);
    await globalHelper.getOngoingRideForDriver(driverId, ongoingRide);
    // await globalHelper.getIssuesForDriver(driverId, issues, start_from_issues, page_size_issues);
    // await globalHelper.getInAppIssuesForDriver(driverId, appIssues, start_from_app_issue, page_size_app_issue);
    await globalHelper.getCancelledRides(
      driverId,
      cancelledRides,
      start_from_can_rides,
      page_size_can_rides,
      2,
    );
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
    var hashMap = {};
    for (var i = (0) in friends) {
      if (!hashMap[friends[i].user_id]) {
        hashMap[friends[i].user_id] = {
          user_id: friends[i].user_id,
          user_name: friends[i].user_name,
          user_email: friends[i].user_email,
          phone_no: friends[i].phone_no,
          verification_status: friends[i].verification_status,
          first_transaction_on: friends[i].first_transaction_on,
          date_registered: friends[i].date_registered,
          is_duplicate: friends[i].is_duplicate,
          failed_reason: friends[i].failed_reason,
          type: friends[i].type,
        };
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
};

exports.getAvilableDrivers = async function (req, res) {
  try {
    var deliveryEnabled = +req.query.delivery_enabled || 0,
      cityId = req.query.city_id,
      vehicleType = req.query.vehicle_type;
    fleetId = 0;

    let data = [];

    var schema = Joi.object({
      city_id: Joi.required(),
      vehicle_type: Joi.number().optional(),
      delivery_enabled: Joi.number().min(0).max(1).optional(),
      request_fleet_id: Joi.number().optional(),
    }).unknown(true);

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
            AND dr.vehicle_type = ?`;

    data = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, [
      req.operator_id,
      cityId,
      vehicleType,
    ]);

    return responseHandler.success(
      req,
      res,
      'Data fetched successfully.',
      data,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.getDriverDocumentDetails_v2 = async function (req, res) {
  try {
    var operatorId = req.operator_id || 1;
    var driverId = req.body.driver_id;

    if (checkBlank([operatorId, driverId])) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    const query = `SELECT driver_id, name, phone_no, vehicle_no, city_id,
    vehicle_type, app_versioncode, device_type, vehicle_year,
    email, date_of_birth, vehicle_make_id,iban_number, access_token,doc_visibility_status,app_versioncode   
FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} WHERE driver_id = ?`;
    const values = [driverId];

    var driver = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);

    if (!driver.length) {
      throw new Error('No driver found');
    }
    driver = driver[0];

    var documents = await Helper.fetchDriverDocs(req.body, driver);

    let documentsList = [];

    if (documents) {
      documentsList = documents;

      for (let i = 0; i < documentsList.length; i++) {
        documentsList[i].doc_status =
          rideConstants.DOCUMENT_STATUS[documentsList[i].doc_status];
      }
    }

    let operatorParams = {
      vehicle_model_enabled: 0,
    };

    await getOperatorParameters(
      ['vehicle_model_enabled'],
      operatorId,
      operatorParams,
    );

    var requiredKeys = ['elm_verification_enabled', 'vehicle_model_enabled'];
    const cityCriteria = [
      { key: 'is_active', value: 1 },
      { key: 'operator_id', value: operatorId },
      { key: 'city_id', value: driver.city_id },
    ];

    var city = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY}`,
      requiredKeys,
      cityCriteria,
    );

    var vehicle_no = '',
      vehicle_type = '',
      vehicleMappingId = '',
      vehicle_id = '';

    let VehicleDetails = await Helper.getCurrentVehicleInfo(driverId);

    if (VehicleDetails.length) {
      vehicle_no = VehicleDetails[0].vehicle_no;
      vehicle_type = VehicleDetails[0].vehicle_type;
      vehicleMappingId = VehicleDetails[0].mapping_id;
      vehicle_id = VehicleDetails[0].vehicle_id;
    } else {
      vehicle_no = driver.vehicle_no;
      vehicle_type = driver.vehicle_type;
    }

    // let TFLinfo = await getDriverTFLInfo(driverId);

    let dbs_checked = 0;
    let license_checked = 0;
    let updated_by = '';
    // if (TFLinfo.length) {
    //     dbs_checked = TFLinfo[0].dbs_checked;
    //     license_checked = TFLinfo[0].license_checked;
    //     updated_by = TFLinfo[0].updated_by;
    // }

    var response = {};
    response.data = {
      driver_id: driver.driver_id,
      phone_no: driver.phone_no,
      vehicle_no: vehicle_no,
      vehicle_id: vehicle_id,
      vehicle_type: vehicle_type,
      vehicle_year: driver.vehicle_year,
      name: driver.name,
      iban_number: driver.iban_number,
      vehicle_mapping_id: vehicleMappingId,
      device_type: driver.device_type,
      app_versioncode: driver.app_versioncode,
      documents: documentsList || [],
      dbs_checked: dbs_checked,
      license_checked: license_checked,
      updated_by: updated_by,
    };

    response.data.elm_registered = city[0].elm_verification_enabled;
    response.data.vehicle_model_enabled_status = city[0].vehicle_model_enabled;
    response.data.captain_number = '';
    response.data.email = driver.email;
    response.data.date_of_birth = driver.date_of_birth;
    return responseHandler.success(
      req,
      res,
      'Data fetched successfully.',
      response.data,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.uploadDocument_v2 = async function (req, res) {
  try {
    
    return responseHandler.success(req, res, 'Data fetched successfully.', '');
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateDocumentStatus_v2 = async function (req, res) {
  try {
    var requestParameters = req.body;
    var operatorId = req.operator_id;
    var driver_id = requestParameters.driver_id;
    var document_id = requestParameters.document_id;
    var status = requestParameters.status;
    var reason = requestParameters.reason;
    var email_id = req.email_from_acl;
    var city = requestParameters.city;
    var expiry_date = requestParameters.expiry_date;
    var agent_id = req.user_id || 0;
    var source = requestParameters.source || 0; // 0 -> Panel, 1 -> Venus
    var hotSeat = requestParameters.hotSeat || 0;
    var driverVehicleMappingId = requestParameters.driver_vehicle_mapping_id;
    var vehicleId = requestParameters.vehicle_id;
    var vehicleNo = requestParameters.vehicle_no;
    var vehicleMapping = requestParameters.vehicle_mapping_id;
    var token = requestParameters.token;
    var domain_token = req.headers.domain_token;

    let result = await Helper.updateDocumentStatusBackChannelHelper_v2(
      driver_id,
      email_id,
      city,
      agent_id,
      source,
      hotSeat,
      document_id,
      operatorId,
      status,
      reason,
      expiry_date,
      driverVehicleMappingId,
      vehicleId,
      vehicleNo,
      vehicleMapping,
      token,
      domain_token,
    );

    delete result.flag;

    return responseHandler.success(req, res, '', result);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateCanRequest = async function (req, res) {
  try {
    // var adminAccessToken        = req.body.admin_access_token;
    // var checkBlankFields        = [adminAccessToken];
    // var checkBlankStatus        = checkBlank(checkBlankFields);

    var userEmail = req.body.user_email;
    var reasonCode = parseInt(req.body.reason);
    var requestType = parseInt(req.body.request_type);
    var reasonMessage = req.body.request_message;

    var operatorParams = req.body.operator_params;

    var operatorId = req.operator_id || 14915;

    if (typeof requestType === 'undefined') {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var canRequest =
      requestType === rideConstant.BLOCK_USER_FLAGS.BLOCK_USER ? 0 : 1;

    var userInfo = `SELECT venus_autos_user_id FROM ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.CUSTOMERS} WHERE user_email = ? AND operator_id = ?`;

    let result = await db.RunQuery(dbConstants.DBS.AUTH_DB, userInfo, [
      userEmail,
      operatorId,
    ]);

    if (result.length > 0) {
      /* 
      Update Live Server
      */
      var stmt = `SELECT reg_as FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} WHERE user_id = ?`;

      var loginType = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, [
        result[0].venus_autos_user_id,
      ]);
      loginType = loginType[0].reg_as;
      if (loginType == rideConstant.LOGIN_TYPE.DRIVER) {
        var blockDriverInLiveTable = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} SET can_request = ? ,autos_enabled = ? WHERE user_email = ? AND operator_id = ?`;

        await db.RunQuery(dbConstants.DBS.LIVE_DB, blockDriverInLiveTable, [
          canRequest,
          0,
          userEmail,
          operatorId,
        ]);
        var blockDriverInDriversTable = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} SET autos_enabled = ? WHERE operator_id = ? AND driver_id = ?`;

        await db.RunQuery(dbConstants.DBS.LIVE_DB, blockDriverInDriversTable, [
          canRequest,
          0,
          operatorId,
          result[0].venus_autos_user_id,
        ]);
      } else {
        var blockUserInLive = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} SET can_request = ? ,autos_enabled = ? WHERE user_email = ? AND operator_id = ?`;

        await db.RunQuery(dbConstants.DBS.LIVE_DB, blockUserInLive, [
          canRequest,
          0,
          userEmail,
          operatorId,
        ]);

        var blockUserInAuthTable = `UPDATE ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.AUTH_USERS} SET can_request = ? WHERE operator_id = ? AND venus_autos_user_id = ?`;

        await db.RunQuery(dbConstants.DBS.AUTH_DB, blockUserInAuthTable, [
          canRequest,
          operatorId,
          result[0].venus_autos_user_id,
        ]);
      }
    }
    return responseHandler.success(req, res, '', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.giveCreditsToUser = async function (req, res) {
  try {
    /* 
    PENDING
    */
    return responseHandler.success(req, res, '', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.get_all_suspended_drivers = async function (req, res) {
  try {
    var city = req.query.city;
    var vehicleType = req.query.vehicle_type;
    var requestRideType = req.request_ride_type;
    var category = req.query.category;
    var operatorId = req.operator_id;
    var fleetId = req.fleet_id;
    var sqlCondition = ``;
    var queryParams = [];

    sqlCondition += `AND drivers.operator_id = ? `;
    queryParams.push(operatorId);
    if (requestRideType) {
      sqlCondition += ` AND drivers.service_type = ? `;
      queryParams.push(requestRideType);
    }

    switch (category) {
      case '0': //only autos
        sqlCondition += `AND drivers.autos_enabled = 0`;
        break;
      case '1': //only delivery
        sqlCondition += ` AND drivers.delivery_enabled = 0 `;
        break;
      case '2': //only autos(include dodo)
        sqlCondition += ` AND drivers.driver_suspended = 1 AND drivers.autos_enabled = 0  `; //OR (drivers.autos_enabled = 0 AND drivers.delivery_enabled = 0))
        break;
      case '3': //only delivery(include autos)
        sqlCondition += ` AND (drivers.delivery_enabled = 0 OR (drivers.autos_enabled = 0 AND drivers.delivery_enabled = 0)) `;
        break;
      case '4': //all drivers
        sqlCondition += ` AND drivers.driver_suspended = 1 `;
        break;
      case '5': //gps locks
        sqlCondition += ` AND (drivers.device_type IN (${rideConstants.DEVICE_TYPE['BL10_GPSLOCK']}, ${rideConstants.DEVICE_TYPE['BL10_GPSLOCK']}, ${rideConstants.DEVICE_TYPE['BL10_GPSLOCK']}) AND (drivers.driver_suspended = 1 OR drivers.autos_enabled = 0)) `;
    }

    var cityCheck = ``;
    if (city > 0) {
      cityCheck = ` AND drivers.city_id = ? `;
      queryParams.push(city);
    }

    var vehicleTypeParam = ``;
    if (vehicleType > 0) {
      vehicleTypeParam = ` AND drivers.vehicle_type = ? `;
      queryParams.push(vehicleType);
    }

    if (fleetId) {
      sqlCondition += ` AND fleet_id IN (?) `;
      queryParams.push(fleetId);
    }

    var get_driver_details =
      `SELECT
            drivers.driver_id,
            drivers.name AS driver_name,
            drivers.external_id,
            drivers.city_id AS city,
            drivers.last_login,
            drivers.phone_no,
            drivers.vehicle_type,
            drivers.vehicle_no AS vehicle_number,
            IF(DATE(drivers.last_ride_on) != DATE('0000-00-00'), drivers.last_ride_on, NULL) AS last_ride_on,
            IF(DATE(drivers.last_delivery_on) != NULL, drivers.last_delivery_on, NULL) AS last_delivery_on,
            drivers.driver_suspended,
            drivers.autos_enabled,
            drivers.delivery_enabled
          FROM
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} AS drivers 
          JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} AS live_users ON live_users.user_id=drivers.driver_id
            WHERE live_users.can_request = 0 ` +
      `GROUP BY
            drivers.driver_id`;

    let data_drivers = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      get_driver_details,
      queryParams,
    );

    return responseHandler.success(req, res, '', data_drivers);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
