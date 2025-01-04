const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  generalConstants,
} = require('../.././bootstart/header');
const { getOperatorParameters } = require('../admin/helper');
const {
  fetchFromRideServer,
  pushFromRideServer,
} = require('../push_notification/helper');

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
