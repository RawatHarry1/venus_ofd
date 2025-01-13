const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  generalConstants,
} = require('../../bootstart/header');
var moment = require('moment');
const _ = require('lodash');

exports.ridesQueryHelper = function (corporateId, driverId, fleetId, status) {
  var ridesQuery = '';

  var valueToBePicked = `SELECT 
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
                          s.is_for_rental,
                          s.start_time,
                          s.end_time,
                          e.city,
                          e.ride_time,
                  e.distance_travelled,
                  d.current_latitude,
                  d.current_longitude,
                          s.cancellation_reasons`;

  var valueToBePickedFrom = `
                      FROM ${dbConstants.DBS.LIVE_DB}.tb_engagements e
                      
                      JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} u ON e.user_id = u.user_id
                      
                      JOIN ${dbConstants.DBS.LIVE_DB}.tb_drivers d ON e.driver_id = d.driver_id

                      JOIN ${dbConstants.DBS.LIVE_DB}.tb_session s ON e.session_id = s.session_id
                      `;

  if (
    status == rideConstants.DASHBOARD_RIDE_STATUS.CANCELLED_REQUESTS ||
    status == rideConstants.DASHBOARD_RIDE_STATUS.CANCELLED_RIDES
  ) {
    valueToBePickedFrom += ` LEFT JOIN (SELECT * FROM ${dbConstants.DBS.LIVE_DB}.tb_nts_booking_info GROUP BY engagement_id) nts ON e.session_id = nts.session_id `;
  } else {
    valueToBePickedFrom += ` LEFT JOIN (SELECT * FROM ${dbConstants.DBS.LIVE_DB}.tb_nts_booking_info WHERE is_vehicle_assigned = 1 ) nts ON e.session_id = nts.session_id `;
  }

  if (corporateId) {
    valueToBePickedFrom += `
           JOIN ${dbConstants.DBS.LIVE_DB}.tb_business_users bu ON bu.business_id = s.is_manual 
      `;

    valueToBePicked += ', bu.external_id AS corporate_id ';
  }

  if (driverId) {
    valueToBePicked +=
      ', d.driver_id, (e.actual_fare - e.venus_commission) AS driver_earnings,s.preferred_payment_mode ';
  }

  if (fleetId) {
    valueToBePicked +=
      ', d.driver_id, d.external_id AS fleet_id, (e.actual_fare - e.venus_commission) AS driver_earnings, s.preferred_payment_mode  ';
  }

  ridesQuery += valueToBePicked + valueToBePickedFrom;

  return ridesQuery;
};

exports.checkBlank = function (arr) {
  var arrlength = arr.length;
  for (var i = 0; i < arrlength; i++) {
    if (arr[i] === '' || arr[i] === '' || arr[i] == undefined) {
      return 1;
    }
  }
  return 0;
};

exports.getTripsData = async function (data) {
  try {
    const numberOfDays = diffInDates(data.start_date, data.end_date, 'days');
    const previousTripsStartDate = subtractDaysFromDate(
      data.start_date,
      numberOfDays,
    );
    const previousTripsEndDate = subtractDaysFromDate(
      data.end_date,
      numberOfDays,
    );

    const tripsQuery = `
      SELECT 
        SUM(calculated_customer_fare) AS cash_sum,
        COUNT(engagement_id) AS total_count,
        COUNT(CASE WHEN status = ? THEN engagement_id END) AS completed_trips,
        COUNT(CASE WHEN status IN (?, ?, ?, ?) THEN engagement_id END) AS cancelled_trips
      FROM ${dbConstants.LIVE_DB.RIDES}
      JOIN ${dbConstants.LIVE_DB.IN_THE_AIR} 
        ON ${dbConstants.LIVE_DB.IN_THE_AIR}.session_id = ${dbConstants.LIVE_DB.RIDES}.session_id
      WHERE
        operator_id_x = ? 
        AND ${dbConstants.LIVE_DB.IN_THE_AIR}.service_type = ? 
        AND DATE(engagement_date) >= ? 
        AND DATE(engagement_date) <= ?`;

    const tripsParams = [
      rideConstants.ENGAGEMENT_STATUS.ENDED,
      rideConstants.ENGAGEMENT_STATUS.CANCELLED_ACCEPTED_REQUEST,
      rideConstants.ENGAGEMENT_STATUS.CANCELLED_BY_CUSTOMER,
      rideConstants.ENGAGEMENT_STATUS.RIDE_CANCELLED_BY_CUSTOMER,
      rideConstants.ENGAGEMENT_STATUS.ACCEPTED_THEN_REJECTED,
      data.operator_id,
      data.request_ride_type,
      data.start_date,
      data.end_date,
    ];

    const previousTripsParams = [
      rideConstants.ENGAGEMENT_STATUS.ENDED,
      rideConstants.ENGAGEMENT_STATUS.CANCELLED_ACCEPTED_REQUEST,
      rideConstants.ENGAGEMENT_STATUS.CANCELLED_BY_CUSTOMER,
      rideConstants.ENGAGEMENT_STATUS.RIDE_CANCELLED_BY_CUSTOMER,
      rideConstants.ENGAGEMENT_STATUS.ACCEPTED_THEN_REJECTED,
      data.operator_id,
      data.request_ride_type,
      previousTripsStartDate,
      previousTripsEndDate,
    ];

    const [trips, previoustrips] = await Promise.all([
      db.RunQuery(dbConstants.DBS.LIVE_DB, tripsQuery, tripsParams),
      db.RunQuery(dbConstants.DBS.LIVE_DB, tripsQuery, previousTripsParams),
    ]);

    const previousTotalCash = _.get(previoustrips, [0, 'cash_sum'], 0);
    const previousTotalCount = _.get(previoustrips, [0, 'total_count'], 0);
    const previousCompletedTrips = _.get(
      previoustrips,
      [0, 'completed_trips'],
      0,
    );
    const previousCanceledTrips = _.get(
      previoustrips,
      [0, 'cancelled_trips'],
      0,
    );

    const totalCash = _.get(trips, [0, 'cash_sum'], 0);
    const totalTrips = _.get(trips, [0, 'total_count'], 0);
    const totalCompletedTrips = _.get(trips, [0, 'completed_trips'], 0);
    const totalCanceledTrips = _.get(trips, [0, 'cancelled_trips'], 0);

    return {
      total_cash: totalCash,
      total_trips: totalTrips,
      total_completed_trips: totalCompletedTrips,
      total_canceled_trips: totalCanceledTrips,
      cash_change: !previousTotalCash
        ? 0
        : ((totalCash - previousTotalCash) / previousTotalCash) * 100,
      trip_change: !previousTotalCount
        ? 0
        : ((totalTrips - previousTotalCount) / previousTotalCount) * 100,
      completed_trip_change: !previousCompletedTrips
        ? 0
        : ((totalCompletedTrips - previousCompletedTrips) /
            previousCompletedTrips) *
          100,
      canceled_trip_change: !previousCanceledTrips
        ? 0
        : ((totalCanceledTrips - previousCanceledTrips) /
            previousCanceledTrips) *
          100,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getDriversData = async function (data) {
  try {
    const query = `
      SELECT
        (SELECT COUNT(id) 
         FROM ${dbConstants.LIVE_DB.CAPTAINS} 
         WHERE operator_id = ? AND service_type = ?) AS total_count,
        (SELECT COUNT(id) 
         FROM ${dbConstants.LIVE_DB.CAPTAINS} 
         WHERE operator_id = ? AND date_registered < ? AND service_type = ?) AS count_before_date,
        (SELECT COUNT(id) 
         FROM ${dbConstants.LIVE_DB.CAPTAINS} 
         WHERE operator_id = ? AND date_registered >= ? AND service_type = ?) AS count_after_date
    `;

    const values = [
      data.operator_id,
      data.request_ride_type,
      data.operator_id,
      data.start_date,
      data.request_ride_type,
      data.operator_id,
      data.end_date,
      data.request_ride_type,
    ];

    const result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);

    return {
      total_drivers: _.get(result, [0, 'total_count'], 0),
      total_drivers_before: _.get(result, [0, 'count_before_date'], 0),
      total_drivers_after: _.get(result, [0, 'count_after_date'], 0),
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getCustomersData = async function (data) {
  try {
    const query = `
      SELECT
        (SELECT COUNT(user_id) 
         FROM ${dbConstants.LIVE_DB.CUSTOMERS} 
         WHERE operator_id = ? AND reg_as = ?) AS total_count,
        (SELECT COUNT(user_id) 
         FROM ${dbConstants.LIVE_DB.CUSTOMERS} 
         WHERE operator_id = ? AND date_registered < ? AND reg_as = ?) AS count_before_date,
        (SELECT COUNT(user_id) 
         FROM ${dbConstants.LIVE_DB.CUSTOMERS} 
         WHERE operator_id = ? AND date_registered >= ? AND reg_as = ?) AS count_after_date
    `;

    const values = [
      data.operator_id,
      generalConstants.userRegistrationStatus.CUSTOMER,
      data.operator_id,
      data.start_date,
      generalConstants.userRegistrationStatus.CUSTOMER,
      data.operator_id,
      data.end_date,
      generalConstants.userRegistrationStatus.CUSTOMER,
    ];

    const result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);

    return {
      total_customers: _.get(result, [0, 'total_count'], 0),
      total_customers_before: _.get(result, [0, 'count_before_date'], 0),
      total_customers_after: _.get(result, [0, 'count_after_date'], 0),
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getRideStatistics = async function (data) {
  const {
    operator_id,
    start_date,
    end_date,
    utc_offset = 0,
    request_ride_type,
  } = data;
  try {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const timeDifference = endDate - startDate;
    const oneDayInMillis = 24 * 60 * 60 * 1000;
    const oneMonthInMillis = 30 * oneDayInMillis;
    let query;
    let groupByClause;
    if (timeDifference <= oneDayInMillis) {
      groupByClause = 'HOUR(DATE_ADD(e.current_time, INTERVAL ? MINUTE))';
      query = `
          SELECT 
              HOUR(DATE_ADD(e.current_time, INTERVAL ? MINUTE)) AS time_frame,
              COUNT(CASE WHEN e.status = 3 THEN 1 END) AS completed_rides,
              COUNT(CASE WHEN e.status IN (5, 8) AND e.current_time IS NOT NULL THEN 1 END) AS cancelled_rides,
              COUNT(CASE WHEN e.status = 6 AND s.requested_drivers > 0 THEN 1 END) AS missed_rides
          FROM ${dbConstants.LIVE_DB.RIDES} AS e
          JOIN ${dbConstants.LIVE_DB.IN_THE_AIR} s ON s.session_id = e.session_id
          WHERE e.operator_id_x = ? 
          AND (DATE_ADD(e.drop_time, INTERVAL ? MINUTE) BETWEEN ? AND ? 
          OR DATE_ADD(e.current_time, INTERVAL ? MINUTE) BETWEEN ? AND ?)
          AND s.service_type = ?
          GROUP BY ${groupByClause}
      `;
    } else if (timeDifference <= oneMonthInMillis) {
      groupByClause = 'DATE(e.current_time)';
      query = `
          SELECT 
              DATE(e.current_time) AS time_frame,
              COUNT(CASE WHEN e.status = 3 THEN 1 END) AS completed_rides,
              COUNT(CASE WHEN e.status IN (5, 8) AND e.current_time IS NOT NULL THEN 1 END) AS cancelled_rides,
              COUNT(CASE WHEN e.status = 6 AND s.requested_drivers > 0 THEN 1 END) AS missed_rides
          FROM ${dbConstants.LIVE_DB.RIDES} AS e
          JOIN ${dbConstants.LIVE_DB.IN_THE_AIR} s ON s.session_id = e.session_id 
          WHERE e.operator_id_x = ? 
          AND (e.drop_time BETWEEN ? AND ? OR e.current_time BETWEEN ? AND ?)
          AND s.service_type = ?
          GROUP BY ${groupByClause}`;
    } else {
      groupByClause = 'YEAR(e.current_time), MONTH(e.current_time)';
      query = `
          SELECT 
              CONCAT(YEAR(e.current_time), '-', LPAD(MONTH(e.current_time), 2, '0')) AS time_frame,
              COUNT(CASE WHEN e.status = 3 THEN 1 END) AS completed_rides,
              COUNT(CASE WHEN e.status IN (5, 8) AND e.current_time IS NOT NULL THEN 1 END) AS cancelled_rides,
              COUNT(CASE WHEN e.status = 6 AND s.requested_drivers > 0 THEN 1 END) AS missed_rides
          FROM ${dbConstants.LIVE_DB.RIDES} AS e
          JOIN ${dbConstants.LIVE_DB.IN_THE_AIR} s ON s.session_id = e.session_id 
          WHERE e.operator_id_x = ? 
          AND (e.drop_time BETWEEN ? AND ? OR e.current_time BETWEEN ? AND ?)
          AND s.service_type = ?
          GROUP BY ${groupByClause}`;
    }

    let values;

    if (timeDifference <= oneDayInMillis) {
      values = [
        utc_offset,
        operator_id,
        utc_offset,
        start_date,
        end_date,
        utc_offset,
        start_date,
        end_date,
        request_ride_type,
        utc_offset,
      ];
    } else {
      values = [
        operator_id,
        start_date,
        end_date,
        start_date,
        end_date,
        request_ride_type,
      ];
    }
    const results = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);

    return results.map((row) => ({
      time_frame:
        row.time_frame instanceof Date
          ? row.time_frame.toISOString().split('T')[0]
          : row.time_frame,
      completed_rides: row.completed_rides || 0,
      cancelled_rides: row.cancelled_rides || 0,
      missed_rides: row.missed_rides || 0,
    }));
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getActiveUsersData = async function (data) {
  const { operator_id, city_id = 0, request_ride_type } = data;
  try {
    let query = `
        SELECT 
            COUNT(CASE WHEN u.reg_as = 1 AND d.verification_status = 1 AND d.service_type = ? THEN 1 END) AS total_driversCount,
            COUNT(CASE WHEN u.reg_as = 0 THEN 1 END) AS total_usersCount
        FROM 
            tb_users u
        LEFT JOIN tb_drivers d ON d.driver_id = u.user_id
        WHERE 
            u.operator_id = ? AND 
            u.city = ?
    `;
    let values = [request_ride_type, operator_id, city_id];
    const results = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);

    return results.map((row) => ({
      total_drivers: row.total_driversCount || 0,
      total_users: row.total_usersCount || 0,
    }));
  } catch (error) {
    throw new Error(error.message);
  }
};

function subtractDaysFromDate(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function diffInDates(startDt, endDt, diffType) {
  var startDate = moment(startDt, 'YYYY-MM-DD HH:mm Z'); // HH:mm:ss
  var endDate = moment(endDt, 'YYYY-MM-DD HH:mm Z');
  var diff = endDate.diff(startDate, diffType);
  return diff;
}

exports.engagementInfofetcher = async function (engagementId, operatorId) {
  try {
    var tableName = `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES}`;

    var sql_new = `SELECT
              tb_session_info.driver_app_versioncode,
              drivers.driver_id,
              drivers.name driver_name,
              drivers.vehicle_no AS driver_car_no,
              users.user_email,
              drivers.city_id AS driver_city,
              drivers.phone_no AS driver_phone,
              users.user_id,
              users.referral_code,
              users.phone_no,
              users.user_name AS user_name,
              users.user_email AS user_email,
              ${dbConstants.LIVE_DB.RIDES}.vehicle_type as driver_vehicle_type,
              ${dbConstants.LIVE_DB.RIDES}.engagement_id AS eng_id,
              CONVERT(ROUND(ride_distance_from_google,2), CHAR) AS ride_distance_from_google,
              CONVERT(ROUND(distance_travelled,2), CHAR) AS distance_travelled,
              ${dbConstants.LIVE_DB.RIDES}.drop_time,
              ${dbConstants.LIVE_DB.RIDES}.drop_latitude,
              ${dbConstants.LIVE_DB.RIDES}.drop_longitude,
              ${dbConstants.LIVE_DB.RIDES}.pickup_latitude,
              ${dbConstants.LIVE_DB.RIDES}.pickup_longitude,
              ${dbConstants.LIVE_DB.RIDES}.tip_amount,
              ${dbConstants.LIVE_DB.RIDES}.net_customer_tax,
              ${dbConstants.LIVE_DB.RIDES}.ride_time,
              ${dbConstants.LIVE_DB.RIDES}.wait_time,
              ${dbConstants.LIVE_DB.RIDES}.paid_using_stripe,
              ${dbConstants.LIVE_DB.RIDES}.pickup_time,
              ${dbConstants.LIVE_DB.RIDES}.accept_time AS cancelled_on,
              ${dbConstants.LIVE_DB.RIDES}.paid_using_wallet,
              ${dbConstants.LIVE_DB.RIDES}.paid_using_paytm,
              ${dbConstants.LIVE_DB.RIDES}.paid_using_mobikwik,
              ${dbConstants.LIVE_DB.RIDES}.accept_distance,
              ${dbConstants.LIVE_DB.RIDES}.convenience_charge,
              ${dbConstants.LIVE_DB.RIDES}.convenience_charge_waiver,
              ${dbConstants.LIVE_DB.RIDES}.actual_fare,
              ${dbConstants.LIVE_DB.RIDES}.debt_added as eng_debt_added,
              ${dbConstants.LIVE_DB.RIDES}.money_transacted AS customer_total_fare,
              ${dbConstants.LIVE_DB.RIDES}.discount AS discount,
              ${dbConstants.LIVE_DB.RIDES}.ride_type AS ride_type_status,
              ${dbConstants.LIVE_DB.RIDES}.accept_distance_subsidy,
              edata.customer_fare_fixed AS fare_fixed,
              ${dbConstants.LIVE_DB.RIDES}.pickup_location_address,
              ${dbConstants.LIVE_DB.RIDES}.drop_location_address,
              ${dbConstants.LIVE_DB.RIDES}.paid_by_customer,
              ${dbConstants.LIVE_DB.RIDES}.engagement_date,
              ${dbConstants.LIVE_DB.RIDES}.addn_info,
              ${dbConstants.LIVE_DB.RIDES}.venus_commission,
              edata.*,
              ${dbConstants.LIVE_DB.RIDES}.status AS engagement_status,
              ${dbConstants.LIVE_DB.RIDES}.driver_accept_longitude,
              ${dbConstants.LIVE_DB.RIDES}.driver_accept_latitude,
              ${dbConstants.LIVE_DB.IN_THE_AIR}.city,
              ${dbConstants.LIVE_DB.IN_THE_AIR}.driver_fare_factor,
              ${dbConstants.LIVE_DB.IN_THE_AIR}.customer_fare_factor,
              ${dbConstants.LIVE_DB.RIDES}.paid_using_freecharge,
              ${dbConstants.LIVE_DB.IN_THE_AIR}.cancellation_charges,
              COALESCE( tb_coupons.title, tb_ride_promotions.title ) AS coupon_title,
              ${dbConstants.LIVE_DB.IN_THE_AIR}.master_coupon,
              tb_coupons.cashback_percentage,
              tb_coupons.cashback_maximum,
              CASE
                WHEN ${dbConstants.LIVE_DB.IN_THE_AIR}.ride_type = 3 THEN 'Dodo'
                WHEN ${dbConstants.LIVE_DB.IN_THE_AIR}.ride_type = 4 THEN 'Delivery Pool'
                ELSE COALESCE(bu.partner_name, 'Venus')
              END AS ride_source,
              CASE
                WHEN ${dbConstants.LIVE_DB.IN_THE_AIR}.ride_type = 3 THEN 'Dodo'
                WHEN ${dbConstants.LIVE_DB.IN_THE_AIR}.ride_type = 2 THEN 'Pool'
                WHEN ${dbConstants.LIVE_DB.IN_THE_AIR}.ride_type = 4 THEN 'Delivery Pool'
                ELSE 'Autos'
              END AS ride_type,
              COALESCE(dbt.debt_amount, 0) AS debt_amount,
              COALESCE(dbt.debt_engagement_id, 0) AS debt_engagement_id,
              cities.waiting_charges_applicable
            FROM
              ${tableName}
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_drivers AS drivers
            ON
              drivers.driver_id = ${dbConstants.LIVE_DB.RIDES}.driver_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} AS cities
            ON
              ${dbConstants.LIVE_DB.RIDES}.sub_region_id = cities.region_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} AS users
            ON
              users.user_id = ${dbConstants.LIVE_DB.RIDES}.user_id
            JOIN
              ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.IN_THE_AIR}
            ON
              ${dbConstants.LIVE_DB.IN_THE_AIR}.session_id = ${dbConstants.LIVE_DB.RIDES}.session_id AND ${dbConstants.LIVE_DB.IN_THE_AIR}.operator_id = ?
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_session_info
            ON
              ${dbConstants.LIVE_DB.IN_THE_AIR}.session_id = tb_session_info.session_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_session_debt_details dbt
            ON
              dbt.session_id = ${dbConstants.LIVE_DB.RIDES}.session_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_business_users bu
            ON
              ${dbConstants.LIVE_DB.IN_THE_AIR}.is_manual = bu.business_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_engagement_data edata
            ON
              ${dbConstants.LIVE_DB.RIDES}.engagement_id = edata.engagement_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_accounts
            ON
              tb_accounts.account_id = ${dbConstants.LIVE_DB.IN_THE_AIR}.applicable_account_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_ride_promotions
            ON
              ${dbConstants.LIVE_DB.IN_THE_AIR}.applicable_promo_id = tb_ride_promotions.promo_id
            LEFT JOIN
              ${dbConstants.DBS.LIVE_DB}.tb_coupons
            ON
              tb_coupons.coupon_id = tb_accounts.coupon_id
            WHERE
              ${dbConstants.LIVE_DB.RIDES}.engagement_id = ?`;

    const engagementInfo = await db.RunQuery(dbConstants.DBS.LIVE_DB, sql_new, [
      operatorId,
      engagementId,
    ]);
    if (Array.isArray(engagementInfo) && !engagementInfo.length) {
      throw new Error('No ride data found for this engagement id');
    }
    // let addnInfo = engagementInfo[0].addn_info;
    // addnInfo = JSON.parse(addnInfo)
    //   (addnInfo.driver_name) ? engagementInfo[0].driver_name = addnInfo.driver_name : 0;
    // (addnInfo.driver_vehicle_reg) ? engagementInfo[0].driver_vehicle_reg = addnInfo.driver_vehicle_reg : 0;
    // (addnInfo.driver_phone) ? engagementInfo[0].driver_phone = addnInfo.driver_phone : 0;
    // (addnInfo.driver_image) ? engagementInfo[0].driver_image = addnInfo.driver_image : 0;

    return engagementInfo;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.calculateWaitTimeFare = function (
  waitTime,
  waitingChargesApplicable,
  fareThresholdWaitingTime,
  farePerWaitingMin,
  fareFactor,
) {
  var waitFare = 0;
  if (waitingChargesApplicable && waitTime >= fareThresholdWaitingTime) {
    waitFare +=
      (waitTime - fareThresholdWaitingTime) * farePerWaitingMin * fareFactor;
  }
  return waitFare;
};

exports.fetchNearestCity = async function (
  lat,
  long,
  operatorId,
  resultWrapper,
) {
  try {
    var dataWrapper = {};
    await distanceFromNearestCity(lat, long, dataWrapper, operatorId);
    await operationalHoursofCurrentDay(dataWrapper, operatorId);

    if (dataWrapper.data) {
      // dataWrapper.data.geoDistance *= 111;
      resultWrapper.city = dataWrapper.data;
    }
    resultWrapper.next_city = dataWrapper.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.isAValidScheduleTime = async function (
  pickupTime,
  currentTimeDiff,
  daysLimit,
) {
  // If the time difference is less than an hour for the schedule, then show user a message
  var minTimeDiff = moment(pickupTime).diff(moment(), 'minutes');
  var dayTimeDiff = moment(pickupTime).diff(moment(), 'days');

  return minTimeDiff >= currentTimeDiff && dayTimeDiff <= daysLimit;
};

exports.hasAlreadyScheduled = async function (userId) {
  var getExisting = `SELECT COUNT(*) as num_schedules FROM ${dbConstants.DBS.LIVE_DB}.tb_schedules WHERE user_id = ? AND status = ? AND pickup_time > NOW()`;
  var values = [userId, rideConstants.SCHEDULE_STATUS.IN_QUEUE];

  const information = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    getExisting,
    values,
  );

  if (information[0].num_schedules === 0) {
    return false;
  } else {
    return true;
  }
};
async function distanceFromNearestCity(lat, long, dataWrapper, operatorId) {
  if (!lat || !long) {
    throw new Error("Latitude and longitude aren't in proper format.");
  }

  lat = parseFloat(lat);
  long = parseFloat(long);

  var getNearestCity = `
SELECT 
  c.city_id, 
  c.city_name, 
  c.is_active, 
  c.night_fare_timings_text, 
  c.night_fare_factor_text, 
  c.latitude, 
  c.longitude, 
  o.eta_multiplication_factor, 
  o.operational_hours_enabled, 
  o.nts_enabled, 
  o.is_PR_enabled, 
  c.is_driver_arrival_factor_enabled, 
  COALESCE(o.fresh_available, c.fresh_available) as fresh_available, 
  o.dispatcher_hop_interval, 
  c.currency, 
  c.utc_offset, 
  c.venus_percent_commission, 
  o.shadow_radius, 
  c.is_dp_automated, 
  o.is_google_eta_enabled, 
  c.currency_symbol,
  o.driver_timeout_penalty, 
  o.dispatcher_hop_radius, 
  COALESCE(o.pay_available, c.pay_available) as pay_available, 
  c.cbcd_applicable, 
  c.c2d_referral_enabled, 
  c.is_osrm_enabled, 
  COALESCE(o.meals_available, c.meals_available) as meals_available, 
  COALESCE(o.delivery_available, c.delivery_available) as delivery_available, 
  COALESCE(o.grocery_available, c.grocery_available) as grocery_available, 
  COALESCE(o.feed_available, c.feed_available) as feed_available, 
  o.fare_roundoff_enabled, 
  o.roundoff_power, 
  o.roundoff_median, 
  c.topup_card_enabled, 
  o.wake_up_lock_enabled, 
  COALESCE(o.menus_available, c.menus_available) as menus_available, 
  COALESCE(o.pros_available, c.pros_available) as pros_available, 
  o.office_address, 
  COALESCE(o.autos_available, c.autos_available) as autos_available, 
  c.osrm_port, 
  c.distance_unit, 
  c.autos_credit_limit, 
  COALESCE(o.polygon_coordinates, c.polygon_coordinates) as region, 
  o.operator_id, 
  o.referral_data, 
  o.customer_rate_card_info, 
  o.enable_vehicle_sets, 
  o.vehicle_set_config, 
  o.driver_fare_enabled, 
  o.req_inactive_drivers, 
  CASE 
    WHEN (CURRENT_TIME >= start_operation_time AND CURRENT_TIME <= end_operation_time AND end_operation_time > start_operation_time) 
      OR (CURRENT_TIME >= start_operation_time AND CURRENT_TIME >= end_operation_time AND end_operation_time < start_operation_time) 
      OR (CURRENT_TIME <= start_operation_time AND CURRENT_TIME <= end_operation_time AND end_operation_time < start_operation_time) 
      OR (end_operation_time = start_operation_time) 
    THEN 1 
    ELSE 0 
  END as is_operation_available, 
  o.check_driver_debt, 
  start_operation_time, 
  end_operation_time, 
  o.show_region_specific_fare, 
  enable_address_localisation, 
  vehicle_services_enabled, 
  o.customer_support_number, 
  o.driver_support_number, 
  o.customer_tutorial_enabled, 
  o.elm_verification_enabled, 
  o.nts_enabled 
FROM 
  ${dbConstants.DBS.LIVE_DB}.tb_cities c 
  JOIN ${dbConstants.DBS.LIVE_DB}.tb_operator_cities o 
    ON c.city_id = o.city_id AND o.operator_id = ? 
WHERE 
  c.polygon_coordinates IS NOT NULL 
  AND c.is_active = 1 
  AND o.is_active = 1;
`;
  var values = [operatorId];

  const nearestCity = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    getNearestCity,
    values,
  );

  dataWrapper.data = nearestCity[0];
}

async function operationalHoursofCurrentDay(dataWrapper, operatorId) {
  if (dataWrapper && !dataWrapper.operational_hours_enabled) {
    return;
  }

  lat = parseFloat(lat);
  long = parseFloat(long);

  var getOperationalTimings = `
SELECT 
  * 
FROM (
  SELECT 
    c.*, 
    h.start_day_id, 
    h.start_time AS local_start_time, 
    DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") AS start_time, 
    DATE_FORMAT((h.end_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") AS end_time, 
    TIMESTAMPDIFF(SECOND, NOW(), h.start_time - INTERVAL c.utc_offset MINUTE) AS diff,  
    CASE 
      WHEN (
        CURRENT_TIME >= DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND CURRENT_TIME <= DATE_FORMAT((h.end_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND DATE_FORMAT((h.end_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") > DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND start_day_id = DAYOFWEEK(NOW() + INTERVAL c.utc_offset MINUTE)
      )
      OR (
        CURRENT_TIME >= DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND CURRENT_TIME >= DATE_FORMAT((h.end_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND DATE_FORMAT((h.end_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") < DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND start_day_id = DAYOFWEEK(NOW() + INTERVAL c.utc_offset MINUTE)
      )
      OR (
        CURRENT_TIME <= DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND CURRENT_TIME <= DATE_FORMAT((h.end_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND DATE_FORMAT((h.end_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") < DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND start_day_id = DAYOFWEEK(NOW() + INTERVAL c.utc_offset MINUTE)
      )
      OR (
        h.end_time - INTERVAL c.utc_offset MINUTE = DATE_FORMAT((h.start_time - INTERVAL c.utc_offset MINUTE), "%H:%i:%s") 
        AND start_day_id = DAYOFWEEK(NOW() + INTERVAL c.utc_offset MINUTE)
      ) 
      THEN 1 
      ELSE 0 
    END AS is_operation_available 
  FROM 
    ${dbConstants.DBS.LIVE_DB}.tb_operational_hours h 
  JOIN 
     ${dbConstants.DBS.LIVE_DB}.tb_cities c 
    ON h.city_id = c.city_id 
  WHERE 
    h.operator_id = ? 
    AND h.city_id = ?  
    AND h.is_active = 1 
) AS a 
ORDER BY 
  is_operation_available DESC, 
  start_day_id ASC;
`;

  var values = [operatorId, dataWrapper.data.city_id];

  const result = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    getOperationalTimings,
    values,
  );

  if (result.length == 0) {
    dataWrapper.data.is_operation_available = 0;
    dataWrapper.data.start_operation_time = '';
    dataWrapper.data.end_operation_time = '';
    dataWrapper.data.day_id = null;
    return;
  }

  if (result[0] && !result[0].is_operation_available) {
    var operationalHoursData = [];
    var date = new Date();
    date.setDate(date.getDate() - 30);
    while (date < new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)) {
      for (var item of result) {
        if (date.getDay() + 1 != item.start_day_id) {
          continue;
        }
        var operationDate = new Date(date.getTime());
        operationDate.setHours(item.local_start_time.split(':')[0]);
        operationDate.setMinutes(item.local_start_time.split(':')[1]);
        operationDate.setSeconds(item.local_start_time.split(':')[2]);
        operationDate.data = item;
        operationalHoursData.push(operationDate);
      }
      date.setDate(date.getDate() + 1);
    }
    operationalHoursData.sort((a, b) => {
      return a - b;
    });
    for (var i = 0; i < operationalHoursData.length; i++) {
      if (
        operationalHoursData[i] >
        new Date(new Date().getTime() + result[0].utc_offset * 60 * 1000)
      ) {
        var endTime = moment(operationalHoursData[i].data.end_time, 'HH:mm:ss');
        var startTime = moment(
          operationalHoursData[i + 1].data.start_time,
          'HH:mm:ss',
        );
        var x = moment.duration(startTime.diff(endTime)).asMinutes();
        if (
          x >= 0 &&
          x < 1 &&
          (operationalHoursData[i + 1].data.start_day_id -
            operationalHoursData[i].data.start_day_id ==
            1 ||
            (operationalHoursData[i + 1].data.start_day_id == 1 &&
              operationalHoursData[i].data.start_day_id == 7))
        ) {
          operationalHoursData[i].data.end_time =
            operationalHoursData[i + 1].data.end_time;
        }
        result[0] = operationalHoursData[i].data;
        break;
      }
    }
  }
  if (result && result.length) {
    dataWrapper.data.is_operation_available = result[0].is_operation_available;
    dataWrapper.data.start_operation_time = result[0].start_time;
    dataWrapper.data.end_operation_time = result[0].end_time;
    dataWrapper.data.day_id = result[0].start_day_id;
  }
}

exports.getTaskDetailsQueryHelper = function (
  deliveryEnabled,
  taskType,
  fleetId,
  requestRideType,
) {
  var fleetIdClause = '';
  let additionalJoin = '';
  let additionalSelect = '';

  if (fleetId) {
    fleetIdClause += ` AND d.fleet_id IN (?) `;
  }

  if (requestRideType == rideConstants.CLIENTS.MARS) {
    additionalJoin = `
						LEFT JOIN 
						${dbConstants.DBS.LIVE_DB}.tb_requested_pkg_session pks
						ON a.session_id = pks.session_id`;
    additionalSelect = `,pks.*`;
  }
  var unacceptedRides = `SELECT
		   a1.session_id,
		   a1.date,
		   a1.request_latitude AS lat,
		   a1.request_longitude AS lon,
		   a1.request_address,
		   b1.user_name AS driver_user_name,
		   b1.user_id AS customer_id,
		   b1.phone_no,
		   c1.drop_location_address,
		   b1.req_stat AS customer_verification_status,
		   d1.vehicle_name,
		   b1.user_image
		FROM
		   ${dbConstants.DBS.LIVE_DB}.tb_session a1
		   JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} b1 ON a1.user_id = b1.user_id
		   JOIN ${dbConstants.DBS.LIVE_DB}.tb_engagements c1 ON a1.session_id = c1.session_id
		   JOIN ${dbConstants.DBS.LIVE_DB}.tb_vehicle_type d1 ON c1.vehicle_type = d1.vehicle_type
		   JOIN
		(SELECT
		   max(a.session_id) AS id
		FROM 
		   ${dbConstants.DBS.LIVE_DB}.tb_session a
		   JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} b ON a.user_id = b.user_id
		WHERE 
		  (
			a.ride_acceptance_flag = 0
			AND a.ride_type != 3
			AND (a.is_active = 1)
			AND a.date > ?
			AND a.date <= ?
			AND a.operator_id = ?
			AND a.city IN (?)
			AND a.service_type = ?
		  )
		GROUP by
			a.user_id
		) l2 ON a1.session_id = l2.id
		GROUP BY session_id`;

  var onGoingRides = `SELECT
		   a.session_id,
		   a.date,
		   a.request_latitude AS lat,
		   a.request_longitude AS lon,
		   a.request_address,
		   b.user_name,
		   b.phone_no,
		   d.name AS driver_name,
		   d.driver_id AS driver_id,
		   c.drop_location_address,
		   c.accept_time,
		   c.ride_type,
		   c.vehicle_type,
		   c.engagement_id,
		   c.user_rating,
		   c.driver_rating,
		   b.req_stat AS customer_verification_status,
		   d.current_latitude AS tracking_latitude,
		   d.current_longitude AS tracking_longitude,
		   b.user_image AS customer_image,
		   b.date_registered AS customer_register_date,
		   b.user_email AS customer_email,
		   b.last_login AS customer_last_login,
		   b.total_rides_as_user,
		   b.total_rating_user,
		   b.last_ride_on AS customer_last_ride,
		   d.date_registered AS driver_register_date,
		   d.vehicle_no AS vehicle_no,
		   d.autos_enabled_on,
		   d.vehicle_status,
		   d.driver_image,
		   d.date_first_activated AS driver_first_active,

		CASE
		   WHEN c.status = 1 THEN "ACCEPTED"
		   WHEN c.status = 2  THEN "STARTED"
		   WHEN c.status = 14  THEN "ARRIVED"
   
		END AS ride_status
		${additionalSelect} -- Add columns from tb_additional_table if condition is met
		FROM
		   ${dbConstants.DBS.LIVE_DB}.tb_session a
		   JOIN ${dbConstants.DBS.LIVE_DB}.tb_engagements c ON a.session_id = c.session_id
		   JOIN ${dbConstants.DBS.LIVE_DB}.tb_drivers d ON c.driver_id = d.driver_id
		   JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} b ON a.user_id = b.user_id
		   ${additionalJoin} -- Add join for tb_additional_table if condition is met
		WHERE
		   (
			 c.status IN (1,2,14)
			 AND a.date > ?
			 AND a.date <= ?
			 AND a.operator_id = ?
			 AND a.city IN (?)
			 AND a.service_type = ?
			 AND a.ride_type != 3
			 ${fleetIdClause}
		   )
		GROUP by a.user_id
		ORDER by a.date DESC`;

  var allRides = `SELECT
		a.session_id,
		a.date,
		a.request_latitude AS lat,
		a.request_longitude AS lon,
		a.request_address,
		b.user_name,
		b.phone_no,
		d.name AS driver_name,
		d.driver_id AS driver_id,
		c.drop_location_address,
		c.accept_time,
		c.ride_type,
		c.vehicle_type,
		c.engagement_id,
		b.req_stat AS customer_verification_status
	 FROM
		${dbConstants.DBS.LIVE_DB}.tb_session a
		JOIN ${dbConstants.DBS.LIVE_DB}.tb_engagements c ON a.session_id = c.session_id
		JOIN ${dbConstants.DBS.LIVE_DB}.tb_drivers d ON c.driver_id = d.driver_id
		JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} b ON a.user_id = b.user_id
	WHERE
		(
			a.date > ?
			AND a.date <= ?
			AND a.operator_id = ?
			AND a.city IN (?)
			AND a.ride_type != 3
			AND a.service_type = ?
			${fleetIdClause}
		)
	 GROUP by a.user_id
	 ORDER by a.date DESC`;

  if (deliveryEnabled) {
    unacceptedRides = `SELECT
			   a1.session_id,
			   a1.date,
			   a1.request_latitude AS lat,
			   a1.request_longitude AS lon,
			   a1.request_address,
			   b1.name AS user_name,
			   b1.phone AS phone_no,
			   b1.latitude,
			   b1.longitude,
			   b1.address
			FROM
			   ${dbConstants.DBS.LIVE_DB}.tb_session a1
			   JOIN ${dbConstants.DBS.LIVE_DB}.tb_delivery b1 ON a1.session_id = b1.session_id
			   JOIN
		   (SELECT
			   max(a.session_id) AS id
			FROM
			   ${dbConstants.DBS.LIVE_DB}.tb_session a
			WHERE
			   (
				 a.ride_type = 3
				 AND ((a.is_active = 1 AND a.ride_acceptance_flag = 0) 
				 OR (a.is_active = 0 AND a.ride_acceptance_flag = 2))
				 AND a.date > ?
				 AND a.date <= ?
				 AND a.operator_id = ?
				 AND a.city IN (?)
				)
			GROUP by a.user_id
				) l2 ON a1.session_id = l2.id`;

    onGoingRides = `SELECT
			   a.session_id,
			   a.date,
			   a.request_latitude AS lat,
			   a.request_longitude AS lon,
			   a.request_address,
			   e.latitude,
			   e.longitude,
			   e.address,
			   e.name AS user_name,
			   e.phone AS phone_no,
			   d.name AS driver_name,
			   d.driver_id AS driver_id,
			   c.drop_location_address,
			   c.accept_time,
			 CASE
			   WHEN c.status = 1 THEN "ACCEPTED"
			   WHEN c.status = 2  THEN "STARTED"
			   WHEN c.status = 14  THEN "ARRIVED"
			 END AS ride_status
			 FROM
			   ${dbConstants.DBS.LIVE_DB}.tb_session a
			   JOIN ${dbConstants.DBS.LIVE_DB}.tb_engagements c ON a.session_id = c.session_id
			   JOIN ${dbConstants.DBS.LIVE_DB}.tb_drivers d ON c.driver_id = d.driver_id
			   JOIN ${dbConstants.DBS.LIVE_DB}.tb_delivery e ON a.session_id = e.session_id
			 WHERE
			   (
				 c.status IN (1,2,14)
				 AND a.date > ?
				 AND a.date <= ?
				 AND a.operator_id = ?
				 AND a.city IN (?)
				 AND a.ride_type = 3
				 ${fleetIdClause}
				)
			 ORDER by
				  a.date DESC`;
  }

  var queryRides;
  if (taskType == 0) {
    queryRides = unacceptedRides;
  } else if (taskType == 1) {
    queryRides = onGoingRides;
  } else if (taskType == 2) {
    queryRides = allRides;
  }

  return queryRides;
};

exports.getScheduledRideDetailsHelper = async function (
  regionId,
  cancelWindowTime,
  vehicleType,
  orderDirection = 'ASC',
  limit = 50,
  offset = 0,
  sSearch = '',
  status = null,
) {
  try {
    let queryConditions = [];
    let values = [cancelWindowTime];
    let countValues = [cancelWindowTime];

    let baseQuery = `
      SELECT 
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
        0 AS is_vip
      FROM 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE} sc 
      JOIN 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} u 
        ON u.user_id = sc.user_id
      JOIN 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} cr 
        ON cr.region_id = sc.region_id
    `;

    queryConditions.push(`sc.region_id IN (${regionId})`);

    queryConditions.push('sc.pickup_time > NOW() - INTERVAL 4 HOUR');

    if (sSearch) {
      queryConditions.push('u.user_name LIKE ?');
      values.push(`%${sSearch}%`);
      countValues.push(`%${sSearch}%`);
    }

    if (status) {
      queryConditions.push('sc.status = ?');
      values.push(status);
      countValues.push(status);
    }

    let whereClause = queryConditions.length
      ? `WHERE ${queryConditions.join(' AND ')}`
      : '';
    let getSchedules = `
      ${baseQuery}
      ${whereClause}
      ORDER BY sc.pickup_time ${orderDirection}
      LIMIT ? OFFSET ?
    `;
    values.push(limit, offset);

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE} sc 
      JOIN 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} u 
        ON u.user_id = sc.user_id
      JOIN 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} cr 
        ON cr.region_id = sc.region_id
      ${whereClause}
    `;

    let [scheduleRideDetails, scheduleRideDetailsCount] = await Promise.all([
      db.RunQuery(dbConstants.DBS.LIVE_DB, getSchedules, values),
      db.RunQuery(dbConstants.DBS.LIVE_DB, countQuery, countValues),
    ]);

    return {
      scheduleRides: scheduleRideDetails,
      scheduleRidesCount: scheduleRideDetailsCount[0]?.total || 0,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
