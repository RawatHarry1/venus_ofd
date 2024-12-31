const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
  } = require('../.././bootstart/header');
  



exports.getLimitedDriverDetailsQueryHelper = function (deliveryEnabled, status, vehicleType, fleetId, cityId,requestRideType) {

    const driverType = {
		'FREE_DRIVERS' : 0,
		'BUSY_DRIVERS' : 1,
		'OFFLINE_DRIVERS' : 2,
		'LIVE_DRIVERS' : 3,
		'ACTIVE_DRIVERS' : 4,
		'DEACTIVATED_DRIVERS' : 5
	};
	var whereClause;
	var orderByClause = ``;
	var fetchDriverDetailsQuery;
	var vehicleEnabledField = 'autos_enabled';
	var vehicleAvailableField = 'autos_available';
	var vehicleOfflineField = 'went_autos_offline';

	if(deliveryEnabled){
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

	switch(Number(status)) {

		case driverType.FREE_DRIVERS :
			whereClause = ` 
							   AND driver_suspended = 0
							   AND status = 0
							   AND current_latitude != 0
							   AND current_longitude != 0
							   AND ${vehicleEnabledField} = 1
							   AND ${vehicleAvailableField} = 1
							   AND location_updated_at >= (NOW() - INTERVAL 120 MINUTE) `
			break;

		case driverType.BUSY_DRIVERS :
			whereClause = `  AND driver_suspended = 0
							   AND status = 1
							   AND current_latitude != 0
							   AND current_longitude != 0
							   AND ${vehicleEnabledField} = 1
							   AND ${vehicleAvailableField} = 1 
							   AND location_updated_at >= (NOW() - INTERVAL 10 MINUTE) `
			break;

		case driverType.OFFLINE_DRIVERS :
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

		case driverType.LIVE_DRIVERS :
			whereClause = `
							   AND driver_suspended = 0
							   AND status IN (0,1)
							   AND current_latitude != 0
							   AND current_longitude != 0
							   AND ${vehicleEnabledField} = 1
							   AND ${vehicleAvailableField} = 1
							   AND location_updated_at >= (NOW() - INTERVAL 120 MINUTE) `;
			break;

		case driverType.ACTIVE_DRIVERS :
			whereClause = `
							   AND driver_suspended = 0
							   AND ${vehicleEnabledField} = 1 
							   AND verification_status = 1 
							   AND location_updated_at >= (NOW() - INTERVAL 2 DAY)`;
			break;

		case driverType.DEACTIVATED_DRIVERS :
			whereClause = `
							   AND driver_suspended = 1
							   AND ${vehicleEnabledField} = 0`;
			break;
	}


	if(+vehicleType){
		whereClause += ` AND vehicle_type = ?`;
	}

	if(fleetId){
		whereClause += ` AND fleet_id IN (?)`
	}

	whereClause += ` AND phone_no NOT LIKE 'd%' `;

	fetchDriverDetailsQuery = selectClause + fromClause + whereClause + orderByClause;
	return fetchDriverDetailsQuery;

}