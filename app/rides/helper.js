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

exports.ridesQueryHelper = function (
  corporateId,
  driverId,
  fleetId,
  status,
) {
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
                          e.city,
                          e.ride_time,
                  e.distance_travelled,
                  d.current_latitude,
                  d.current_longitude,
                          s.cancellation_reasons`;

  var valueToBePickedFrom = `
                      FROM venus_live.tb_engagements e
                      
                      JOIN venus_live.tb_users u ON e.user_id = u.user_id
                      
                      JOIN venus_live.tb_drivers d ON e.driver_id = d.driver_id

                      JOIN venus_live.tb_session s ON e.session_id = s.session_id
                      `;

  if (status == rideConstants.DASHBOARD_RIDE_STATUS.CANCELLED_REQUESTS || status == rideConstants.DASHBOARD_RIDE_STATUS.CANCELLED_RIDES) {

    valueToBePickedFrom += ` LEFT JOIN (SELECT * FROM venus_live.tb_nts_booking_info GROUP BY engagement_id) nts ON e.session_id = nts.session_id `;

  } else {

    valueToBePickedFrom += ` LEFT JOIN (SELECT * FROM venus_live.tb_nts_booking_info WHERE is_vehicle_assigned = 1 ) nts ON e.session_id = nts.session_id `;
  }

  if (corporateId) {

    valueToBePickedFrom += `
           JOIN venus_live.tb_business_users bu ON bu.business_id = s.is_manual 
      `;

    valueToBePicked += ', bu.external_id AS corporate_id ';

  }

  if (driverId) {

    valueToBePicked += ', d.driver_id, (e.actual_fare - e.venus_commission) AS driver_earnings,s.preferred_payment_mode ';
  }

  if (fleetId) {

    valueToBePicked += ', d.driver_id, d.external_id AS fleet_id, (e.actual_fare - e.venus_commission) AS driver_earnings, s.preferred_payment_mode  ';
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
  const { operator_id, start_date, end_date, utc_offset = 0, request_ride_type } =
    data;
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
              ${dbConstants.DBS.LIVE_DB}.tb_users AS users
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
              ${dbConstants.LIVE_DB.RIDES}.engagement_id = ?`


    const engagementInfo = await db.RunQuery(dbConstants.DBS.LIVE_DB, sql_new, [operatorId, engagementId]);
    if (Array.isArray(engagementInfo) && !engagementInfo.length) {
      throw new Error("No ride data found for this engagement id");
    }
    // let addnInfo = engagementInfo[0].addn_info;
    // addnInfo = JSON.parse(addnInfo)
    //   (addnInfo.driver_name) ? engagementInfo[0].driver_name = addnInfo.driver_name : 0;
    // (addnInfo.driver_vehicle_reg) ? engagementInfo[0].driver_vehicle_reg = addnInfo.driver_vehicle_reg : 0;
    // (addnInfo.driver_phone) ? engagementInfo[0].driver_phone = addnInfo.driver_phone : 0;
    // (addnInfo.driver_image) ? engagementInfo[0].driver_image = addnInfo.driver_image : 0;

    return engagementInfo

  } catch (error) {
    throw new Error(error.message);
  }
};

exports.calculateWaitTimeFare = function (waitTime, waitingChargesApplicable, fareThresholdWaitingTime, farePerWaitingMin, fareFactor) {
  var waitFare = 0;
  if (waitingChargesApplicable && waitTime >= fareThresholdWaitingTime) {
    waitFare += (waitTime - fareThresholdWaitingTime) * farePerWaitingMin * fareFactor;
  }
  return waitFare;
}
