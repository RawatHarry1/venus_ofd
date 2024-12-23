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

exports.ridesQueryHelper = async function (
  corporateId,
  driverId,
  fleetId,
  status,
) {
  return true;
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
  const { operator_id, start_date, end_date, utc_offset, request_ride_type } =
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
  const { operator_id, city_id, request_ride_type } = data;
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
