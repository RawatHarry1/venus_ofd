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


async function getDriverRideInfo(driverId, startFrom, pageSize, responseData) {
  var getContactInfo = ` SELECT 
            COALESCE(b.date_first_activated, b.date_registered) AS driver_date_registered,
            b.driver_id AS user_id,
            b.name AS user_name,
            b.last_latitude,
            b.last_longitude,
            b.last_updated_on,
            b.last_login,
            b.driver_image,
            b.email AS user_email,
            b.vehicle_no AS driver_car_no,
            b.city_id AS city,
            b.phone_no,
            b.payment_status,
            b.autos_enabled,
            b.delivery_enabled,
            b.driver_suspended,
            b.app_versioncode,
            b.device_name,
            b.os_version,
            IF(b.last_ride_on < b.date_registered, NULL, b.last_ride_on) AS last_ride_on,
            b.date_of_birth,
            b.note,
            b.status,
            live_users.can_request,
            b.driver_suspended AS is_deactivated,
            reasons.reason_text AS deactivation_reason,
            b.phone_no AS del_phone_no,
            b.email AS del_email
        FROM 
            tb_drivers AS b
        JOIN 
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} live_users 
            ON b.driver_id = live_users.user_id
        LEFT JOIN 
            ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.SUSPEND_LOGS} deactivation 
            ON b.driver_id = deactivation.driver_id
        LEFT JOIN 
            ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.SUSPEND_REASON} reasons 
            ON deactivation.suspension_reason_id = reasons.id
        WHERE 
            b.driver_id = ?;
      `;

  let contactInfo = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    getContactInfo,
    [driverId],
  );
  if (!contactInfo.length) {
    return responseData;
  }

  responseData['Driver Id'] = driverId;
  responseData['last_latitude_longitude'] = `${contactInfo[0].last_latitude}, ${contactInfo[0].last_longitude}`;
  responseData['last_location_updated'] = contactInfo[0].last_updated_on;
  responseData['last_login'] = contactInfo[0].last_login;
  responseData['Driver Name'] = contactInfo[0].user_name;
  responseData['driver_email'] = contactInfo[0].is_deactivated ? contactInfo[0].del_email : contactInfo[0].user_email;
  responseData['City'] = contactInfo[0].city;
  responseData['Phone No'] = contactInfo[0].is_deactivated ? contactInfo[0].del_phone_no : contactInfo[0].phone_no;
  responseData['Suspended'] = contactInfo[0].driver_suspended;
  responseData['deactivation_reason'] = contactInfo[0].deactivation_reason;
  responseData['app_version'] = contactInfo[0].app_versioncode;
  responseData['Vehicle Number'] = contactInfo[0].driver_car_no;
  responseData['Joining Date'] = contactInfo[0].driver_date_registered;
  responseData['Last Ride On'] = contactInfo[0].last_ride_on;
  responseData['Device Name'] = contactInfo[0].device_name;
  responseData['OS version'] = contactInfo[0].os_version;
  responseData['Autos Enabled'] = contactInfo[0].autos_enabled;
  responseData['Dodo Enabled'] = contactInfo[0].delivery_enabled;
  responseData['Driver Image'] = contactInfo[0].driver_image || ''
  responseData.date_of_birth = contactInfo[0].date_of_birth;
  responseData.note = contactInfo[0].note;
  responseData.can_request = contactInfo[0].can_request
  responseData.status = contactInfo[0].status
  responseData['Payment Holded'] = (contactInfo[0].payment_status == 0 ? 1 : 0)

  responseData.walletCompanyName = "";
  responseData.walletNumber = "";
  responseData.walletCompanyId = "";

  var walletNumberData = await getWallerNumber(parseInt(driverId));

  if (walletNumberData.length) {
    walletNumberData = walletNumberData[0];

    responseData.walletCompanyName = walletNumberData.companyName;
    if (walletNumberData.companyName == "Other") {
      responseData.walletCompanyName = walletNumberData.otherName;
    }
    responseData.walletNumber = walletNumberData.wallet_number;
    responseData.walletCompanyId = walletNumberData.id;
  }
  var paginationDetails = {
    startFrom: startFrom,
    pageSize: pageSize
  }
  var endAt = paginationDetails.startFrom + paginationDetails.pageSize;
  await upDatePaginationDetails(driverId, paginationDetails, endAt)
  console.log(paginationDetails);
  return await getDriverRideData(driverId, paginationDetails, responseData);

}

async function upDatePaginationDetails(driverId, paginationDetails,endAt) {
  const sql = `
        SELECT 
            t1.engagement_date, 
            counter, 
            @cc AS startCounter, 
            @cc := @cc + counter AS endCounter 
        FROM 
            (
                SELECT 
                    engagement_date, 
                    COUNT(1) AS counter 
                FROM 
                    ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES} 
                WHERE 
                    driver_id = ? 
                    AND status = 3 
                GROUP BY 
                    engagement_date 
                ORDER BY 
                    engagement_date DESC
            ) AS t1 
        JOIN 
            (SELECT @cc := 0) AS t2 
        GROUP BY 
            t1.engagement_date 
        HAVING 
            (
                (? >= startCounter AND ? < endCounter) 
                OR 
                (? >= startCounter AND ? < endCounter)
            ) 
        ORDER BY 
            engagement_date DESC;
    `;

  var result = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    sql,
    [driverId, paginationDetails.startFrom,
      paginationDetails.startFrom, endAt, endAt],
  );
  if (!paginationDetails.length) {
    return paginationDetails;
  }
  paginationDetails.startDate = result[0].engagement_date;
  paginationDetails.startFrom -= parseInt(result[0].startCounter);

  if (endAt > parseInt(result[result.length - 1].endCounter)) {
    paginationDetails.endDate = '2011-01-01 00:00:00';
  }
  else {
    paginationDetails.endDate = result[result.length - 1]['engagement_date']
  }
  return paginationDetails;


}
async function getDriverRideData(driverId, paginationDetails, responseData) {
  var startFrom = paginationDetails.startFrom;
  var pageSize = paginationDetails.pageSize;
  var endDate = paginationDetails.endDate;
  var startDate = paginationDetails.startDate;
  const sql = `
                 SELECT 
              tb_engagements.engagement_id, 
              drop_time, 
              ride_distance_from_google, 
              distance_travelled, 
              ride_time, 
              tb_engagements.user_rating, 
              tb_engagements.driver_rating, 
              tb_engagements.calculated_driver_fare, 
              tb_engagements.calculated_customer_fare, 
              tb_engagements.paid_by_customer, 
              tb_engagements.paid_using_wallet, 
              tb_engagements.paid_using_stripe, 
              tb_engagements.calculated_customer_fare, 
              tb_engagements.money_transacted, 
              tb_engagements.net_customer_tax, 
              tb_engagements.discount, 
              actual_fare, 
              tb_engagements.engagement_date, 
              (tb_engagements.calculated_driver_fare - tb_engagements.venus_commission) AS driver_payout, 
              tb_session.customer_fare_factor, 
              tb_session.driver_fare_factor, 
              tb_engagements.user_id AS customer_id, 
              CASE 
                  WHEN tb_session.ride_type = 3 THEN 'Dodo' 
                  WHEN tb_session.ride_type = 4 THEN 'Delivery Pool'
                  ELSE COALESCE(bu.partner_name, 'Venus') 
              END AS ride_source, 
              CASE 
                  WHEN tb_session.ride_type = 3 THEN 'Dodo'  
                  WHEN tb_session.ride_type = 2 THEN 'Pool'
                  WHEN tb_session.ride_type = 4 THEN 'Delivery Pool' 
                  WHEN tb_session.ride_type = 0 AND tb_engagements.vehicle_type = 3 THEN 'Taxi'
                  ELSE 'Autos' 
              END AS ride_type, 
              caselogs.issue_id AS start_end, 
              ref_req.is_reversed, 
              ref_req.is_automated 
          FROM 
              ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES} tb_engagements
          LEFT JOIN 
              ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.IN_THE_AIR}  ON tb_session.session_id = tb_engagements.session_id 
          LEFT JOIN 
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BUSINESS_USER} bu ON tb_session.is_manual = bu.business_id 
          LEFT JOIN 
             ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.CASE_LOGS} AS caselogs 
              ON caselogs.engagement_id = tb_engagements.engagement_id 
              AND caselogs.issue_id = 1 
              AND caselogs.status = 1 
          LEFT JOIN 
              ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.REFOUND_REQUESTS} AS ref_req 
              ON ref_req.eng_id = tb_engagements.engagement_id 
              AND ref_req.source_id = 1 
          WHERE 
              tb_engagements.driver_id = ? 
              AND tb_engagements.status = ? 
              AND engagement_date BETWEEN DATE(?) AND DATE(?) 
          ORDER BY 
              engagement_id DESC 
          LIMIT ?, ?;
      `;

  var driverInfo = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    sql,
    [driverId, 3, startDate, endDate, startFrom, pageSize],
  );

  if (!driverInfo.length) {
    return responseData.info = [];
  }

  if (driverInfo.length >= 0) {
    var infoArray = [];
    var todays_completed_rides = 0;
    for (var i = 0; i < driverInfo.length; i++) {
      infoArray.push({
        'Engagement ID': driverInfo[i].engagement_id,
        'Customer ID': driverInfo[i].customer_id,
        'Drop Time': new Date(driverInfo[i].drop_time),
        'Distance Travelled': driverInfo[i].distance_travelled,
        'Google Distance': driverInfo[i].ride_distance_from_google,
        'Duration': driverInfo[i].ride_time,
        'Fare': driverInfo[i].actual_fare,
        'Customer Fare Factor': driverInfo[i].customer_fare_factor,
        'Driver Fare Factor': driverInfo[i].driver_fare_factor,
        'Ride Source': driverInfo[i].ride_source,
        'Ride Type': driverInfo[i].ride_type,
        'Start End': driverInfo[i].start_end,
        'Start End Reversed': driverInfo[i].start_end == null ? null : driverInfo[i].is_reversed,
        'Start End Automated': driverInfo[i].start_end == null ? null : driverInfo[i].is_automated,
        'User Rating': driverInfo[i].user_rating,
        'Driver Rating': driverInfo[i].driver_rating,
        'Driver Payout': driverInfo[i].driver_payout,
        'Calculated Driver Fare': driverInfo[i].calculated_driver_fare,
        'Calculated Customer Fare': driverInfo[i].calculated_customer_fare,
        'Paid By Customer Cash': driverInfo[i].paid_by_customer,
        'Paid By Wallet': driverInfo[i].paid_using_wallet,
        'Tax by driver': driverInfo[i].net_customer_tax,
        'Discount': driverInfo[i].discount,
        'Money Transacted': driverInfo[i].money_transacted
      });
      var rideDate = new Date(driverInfo[i].engagement_date);
      var curDate = new Date();
      if (utils.getPlainDateFormat(rideDate) == utils.getPlainDateFormat(curDate)) {
        todays_completed_rides++;
      }
    }
    responseData['todays_completed_rides'] = todays_completed_rides;
    responseData.info = infoArray;
  }
  return responseData;
}

async function getWallerNumber(driverId) {
  const query = `
    SELECT 
        co.id,
        co.name AS companyName,
        dwn.company_name AS otherName,
        dwn.wallet_number
    FROM 
        tb_driver_wallet_number dwn
    LEFT JOIN 
        tb_companies co 
        ON dwn.company_id = co.id AND co.status = 1
    WHERE 
        dwn.driver_id = ? 
        AND dwn.status = 1
    GROUP BY 
        dwn.driver_id;
`;

  let walletNumberData = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    query,
    [driverId],
  );
  return walletNumberData;
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


    var getDriverRideInfo2 = await getDriverRideInfo(driverId, start_from_rides, page_size_rides, responseData);


    return responseHandler.success(req, res, 'Driver Info Sents', responseData);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }

}

