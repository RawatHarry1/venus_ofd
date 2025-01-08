const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  generalConstants,
  authConstants,
} = require('../.././bootstart/header');
const { getOperatorParameters } = require('../admin/helper');
const {
  fetchFromRideServer,
  pushFromRideServer,
} = require('../push_notification/helper');
const FormData = require('form-data');
var fs = require('fs');
var axios = require('axios');

exports.getLimitedDriverDetailsQueryHelper = function (
  deliveryEnabled,
  status,
  vehicleType,
  fleetId,
  cityId,
  requestRideType,
) {
  const driverType = {
    FREE_DRIVERS: 0,
    BUSY_DRIVERS: 1,
    OFFLINE_DRIVERS: 2,
    LIVE_DRIVERS: 3,
    ACTIVE_DRIVERS: 4,
    DEACTIVATED_DRIVERS: 5,
  };
  var whereClause;
  var orderByClause = ``;
  var fetchDriverDetailsQuery;
  var vehicleEnabledField = 'autos_enabled';
  var vehicleAvailableField = 'autos_available';
  var vehicleOfflineField = 'went_autos_offline';

  if (deliveryEnabled) {
    vehicleEnabledField = 'delivery_enabled';
    vehicleAvailableField = 'delivery_available';
    vehicleOfflineField = 'went_delivery_offline';
  }
  var selectClause = `SELECT
						   name,
						   driver_id,
						   phone_no,
						   driver_image,
						   last_ride_on,
						   date_of_birth,
						   location_updated_at,
						   CASE WHEN ABS(current_latitude) > 0.001 THEN current_latitude ELSE last_latitude END as current_latitude,
						   CASE WHEN ABS(current_longitude) > 0.001 THEN current_longitude ELSE last_longitude END as current_longitude`;

  var fromClause = ` FROM
						  ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS}
						WHERE
							   operator_id = ?
							   AND service_type = ?
							   AND city_id IN (?)`;

  switch (Number(status)) {
    case driverType.FREE_DRIVERS:
      whereClause = ` 
							   AND driver_suspended = 0
							   AND status = 0
							   AND current_latitude != 0
							   AND current_longitude != 0
							   AND ${vehicleEnabledField} = 1
							   AND ${vehicleAvailableField} = 1
							   AND location_updated_at >= (NOW() - INTERVAL 120 MINUTE) `;
      break;

    case driverType.BUSY_DRIVERS:
      whereClause = `  AND driver_suspended = 0
							   AND status = 1
							   AND current_latitude != 0
							   AND current_longitude != 0
							   AND ${vehicleEnabledField} = 1
							   AND ${vehicleAvailableField} = 1 
							   AND location_updated_at >= (NOW() - INTERVAL 10 MINUTE) `;
      break;

    case driverType.OFFLINE_DRIVERS:
      selectClause += `, CASE
							   WHEN ${vehicleOfflineField} is not null THEN  ${vehicleOfflineField}
							   ELSE
							   last_login
							   END
							   AS last_active_time
							   `;

      whereClause = ` AND ((current_latitude = 0 AND current_longitude = 0) OR ${vehicleAvailableField} = 0)
								AND driver_suspended = 0
								AND ${vehicleEnabledField} = 1
								AND verification_status = 1 `;

      orderByClause = ` ORDER BY last_active_time desc`;
      break;

    case driverType.LIVE_DRIVERS:
      whereClause = `
							   AND driver_suspended = 0
							   AND status IN (0,1)
							   AND current_latitude != 0
							   AND current_longitude != 0
							   AND ${vehicleEnabledField} = 1
							   AND ${vehicleAvailableField} = 1
							   AND location_updated_at >= (NOW() - INTERVAL 120 MINUTE) `;
      break;

    case driverType.ACTIVE_DRIVERS:
      whereClause = `
							   AND driver_suspended = 0
							   AND ${vehicleEnabledField} = 1 
							   AND verification_status = 1 
							   AND location_updated_at >= (NOW() - INTERVAL 2 DAY)`;
      break;

    case driverType.DEACTIVATED_DRIVERS:
      whereClause = `
							   AND driver_suspended = 1
							   AND ${vehicleEnabledField} = 0`;
      break;
  }

  if (+vehicleType) {
    whereClause += ` AND vehicle_type = ?`;
  }

  if (fleetId) {
    whereClause += ` AND fleet_id IN (?)`;
  }

  whereClause += ` AND phone_no NOT LIKE 'd%' `;

  fetchDriverDetailsQuery =
    selectClause + fromClause + whereClause + orderByClause;
  return fetchDriverDetailsQuery;
};

exports.fetchDriverDocs = async function (body, driverWrapper) {
  try {
    body.access_token = driverWrapper.access_token;
    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.FETCH_REQUIRED_DOCS;

    let responseWrapper = await fetchFromRideServer(body, endpoint);

    return responseWrapper;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.getCurrentVehicleInfo = async function (driverId) {
  var query = `SELECT 
  dvm.id mapping_id, 
  dvm.vehicle_status, 
  dvm.ownership_status, 
  v.vehicle_no,
  v.vehicle_image,
  v.vehicle_brand,
  v.vehicle_brand,
  v.vehicle_name,
  v.vehicle_year,
  v.vehicle_type,
  v.vehicle_make_id,
  v.vehicle_fleet_id,
  v.vehicle_id
FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_MAPPING} dvm 
LEFT join ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLES} v on v.vehicle_id = dvm.vehicle_id
where dvm.driver_id =? and dvm.vehicle_status =? AND  dvm.status not in (2)`;

  var values = [driverId, 1];

  return await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);
  // return utils.executePromiseConnectionQuery(connection_live, query, values);
};

exports.updateDocumentStatusBackChannelHelper_v2 = async function (
  driver_id,
  email_id,
  city_id,
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
  aclToken,
  domain_token,
) {
  try {
    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.UPDATE_DOCS;
    let body = {
      city_id: city_id,
      driver_id: driver_id.toString(),
      document_id: document_id.toString(),
      operator_id: operatorId,
      status: status.toString(),
      reason: reason.toString(),
      expiry_date: expiry_date,
      password: generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD,
      vehicle_mapping_id: vehicleMapping,
      vehicle_id: vehicleId,
      vehicle_no: vehicleNo,
      token: aclToken,
      domain_token: domain_token,
    };
    let responseWrapper = await pushFromRideServer(body, endpoint);
    return responseWrapper;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.postRequsestFormData = async function (requestBody, endpoint) {
  try {
    let resultWrapper = {};
    const url = rideConstants.SERVERS.AUTOS_SERVER + endpoint;

    const formData = new FormData();
    Object.entries(requestBody).forEach(([key, value]) => {
      if (value instanceof Object && typeof value.pipe === 'function') {
        formData.append(key, value, { filename: key });
      } else {
        formData.append(key, value);
      }
    });

    const headers = {
      ...formData.getHeaders(),
      operatortoken: requestBody.operator_token,
      accesstoken: requestBody.access_token,
      domain_token: requestBody.domain_token,
    };

    const response = await axios.post(url, formData, { headers });

    if (response.data && response.data.data) {
      resultWrapper = response.data.data;
    } else {
      resultWrapper = response.data;
    }
    return resultWrapper;
  } catch (error) {
    console.error('Error pushing to ride server:', error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
};

exports.creditDebitHelper = async function (userId, userType, operatorId, transactionType, reason, refEngagementId, amount, source) {
  try {
    let insertObj = {
      user_id: userId,
      type: transactionType,
      operator_id: operatorId,
      reason: reason,
      created_by: source,
      amount: amount,
      ref_engagement_id:  '123',
      user_type: userType
    };

      // Extract keys and values from insertObj
  const keys = Object.keys(insertObj);
  const vaalues = Object.values(insertObj);

  // Build the SET part dynamically
  const setClause = keys.map((key) => `\`${key}\` = ?`).join(', ');

  var driverRechargeQuery = `INSERT INTO ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.CREDIT_LOGS} SET ${setClause}`;
    let clientId = authConstants.CLIENTS_ID.AUTOS_CLIENT_ID

    let insertResult = await db.RunQuery(dbConstants.DBS.LIVE_LOGS, driverRechargeQuery, vaalues);

    var getUserId =
      `SELECT user_id, money_in_wallet_f as money_in_wallet, real_money_ratio, city_reg FROM ${dbConstants.DBS.AUTH_DB}.tb_users WHERE venus_autos_user_id = ?`;


    let authUser = await db.RunQuery(dbConstants.DBS.AUTH_DB, getUserId, [userId]);
    if (!authUser) {
      throw new Error("no user found");

    }
    authUser = authUser[0]
    var newRatio = -2000000;

    let insertId = insertResult.insertId;
    switch (transactionType) {
      case authConstants.TRANSACTION_TYPE.CREDIT:
        var addCreditTransaction =
          `INSERT INTO  ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.TNX}(user_id, client_id, txn_type, reference_id, amount, real_money_ratio, city_reg, event, expiry_date, creditedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        var values = [authUser.user_id, clientId, transactionType, insertId, amount, newRatio, authUser.city_reg, 'abc', '2030-12-31', "admin"];

        console.log(values);
        

        await db.RunQuery(dbConstants.DBS.AUTH_DB, addCreditTransaction, values);

        var updateBalance = `UPDATE ${dbConstants.DBS.AUTH_DB}.tb_users SET money_in_wallet_f = money_in_wallet_f = ? WHERE user_id = ? `;

        await db.RunQuery(dbConstants.DBS.AUTH_DB, updateBalance, [amount, userId]);

        break;
      case authConstants.TRANSACTION_TYPE.DEBIT:

        break;
    }

    let failedStatusUpdate = `UPDATE ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.CREDIT_LOGS} SET STATUS = 1 WHERE id = ? `;
    await db.RunQuery(dbConstants.DBS.LIVE_LOGS, failedStatusUpdate, [insertId]);
    return
  } catch (error) {
    throw new Error(error.message);

  }
}
