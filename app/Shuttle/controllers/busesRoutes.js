const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
    rideConstants
} = require('../../../bootstart/header');
var Joi = require('joi');
const moment = require('moment');


exports.fetchVehicleMakeDetails = async function (req, res) {
    try {
        var response = {};
        var query = `SELECT id, color, is_active FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_COLOURS}`;
        response.vehicles_colours = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, []);
        var query = `SELECT id, no_of_seat_belts, is_active FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLES_SEAT_BELTS}`;

        response.seat_belts = await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            query,
            [],
        );

        var query = `SELECT id, no_of_doors, is_active FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLES_DOORS}`;

        response.vehicles_doors = await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            query,
            [],
        );
        return responseHandler.success(req, res, 'colours fetched Successfully', response);
    } catch (error) {
        errorHandler.errorHandler(error, req, res);
    }
};

exports.fetchVehicleBuses = async function (req, res) {
    try {
        let { is_active = 1, iDisplayLength, iDisplayStart, sSearch = '', vehicle_type } = req.query;
        let operatorId = req.operator_id;
        let requestRideType = req.request_ride_type;

        delete req.query.token;


        const schema = Joi.object({
            city_id: Joi.number().required(),
            vehicle_type: Joi.number().required(),
            is_active: Joi.number().integer().optional(),
            iDisplayLength: Joi.number().integer().optional(),
            iDisplayStart: Joi.number().integer().optional(),
            sSearch: Joi.string().allow('').optional(),
        });

        const { error } = schema.validate(req.query);
        if (error) return responseHandler.parameterMissingResponse(res, '');

        const limit = Number(iDisplayLength || 50);
        const offset = Number(iDisplayStart || 0);
        const searchKeyword = `%${sSearch}%`;


        let baseQuery = `SELECT 
                            vh.*,
                            vc.*,
                            vm.*
                        FROM 
                          ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLES} vh
                        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_MAKE_CUSTOMISATION} vc
                           ON vh.vehicle_make_id = vc.id
                        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_MAKE} vm
                           ON vc.model_id = vm.id AND vm.service_type = ?
                        WHERE 
                          vh.operator_id = ? AND 
                          vh.status = ? AND
                          vm.is_active = 1 AND
                          vh.vehicle_type = ? AND
                          vh.vehicle_name IS NOT NULL
                        `;

        let params = [requestRideType, operatorId, is_active, vehicle_type];


        if (sSearch) {
            baseQuery += ` AND (vh.vehicle_name LIKE ? OR vm.model_name LIKE ?)`;
            params.push(searchKeyword, searchKeyword);
        }

        baseQuery += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const vehicleBuses = await db.RunQuery(dbConstants.DBS.LIVE_DB, baseQuery, params);

        return responseHandler.success(req, res, 'Buses fetched successfully', vehicleBuses);
    } catch (error) {
        errorHandler.errorHandler(error, req, res);
    }
};

exports.assignBusToDriver = async function (req, res) {
    try {
        const { vehicle_id, driver_id, start_time, route_id, city_id, route_end_time } = req.body;
        const { operator_id: operatorId, request_ride_type: requestRideType } = req;

        // Validation Schema
        const schema = Joi.object({
            vehicle_id: Joi.number().required(),
            driver_id: Joi.number().required(),
            start_time: Joi.string().required(), // Format: "YYYY-MM-DD HH:mm:ss",
            route_end_time: Joi.string().required(), // Format: "YYYY-MM-DD HH:mm:ss",
            city_id: Joi.number().required(),
            route_id: Joi.number().required()
        });

        delete req.body.token;
        const { error } = schema.validate(req.body);
        if (error) return responseHandler.parameterMissingResponse(res, '');

        // Database Constants
        const { LIVE_DB } = dbConstants.DBS;
        const { STOPS_TABLE, ROUTES_TABLE, BUS_DRIVER_ASSIGN_TABLE, CAPTAINS, VEHICLES } = dbConstants.LIVE_DB;

        // Fetch Driver Details
        const driverQuery = `SELECT vehicle_type FROM ${LIVE_DB}.${CAPTAINS} WHERE driver_id = ?`;
        const driverResult = await db.RunQuery(LIVE_DB, driverQuery, [driver_id]);
        if (driverResult.length == 0) {
            return responseHandler.returnErrorMessage(res, `Driver not found`);
        }
        const driverVehicleType = driverResult[0]?.vehicle_type;

        // Fetch Vehicle Details
        const vehicleQuery = `SELECT vehicle_type FROM ${LIVE_DB}.${VEHICLES} WHERE vehicle_id = ?`;
        const vehicleResult = await db.RunQuery(LIVE_DB, vehicleQuery, [vehicle_id]);
        if (vehicleResult.length == 0) {
            return responseHandler.returnErrorMessage(res, `Vehicle not found`);
        }
        const getRouteQuery = `SELECT * FROM ${LIVE_DB}.${ROUTES_TABLE} WHERE id = ?`;
        const result = await db.RunQuery(LIVE_DB, getRouteQuery, [route_id]);
        if (result.length == 0) {
            return responseHandler.returnErrorMessage(res, `route not found`);
        }
        const vehicleType = vehicleResult[0]?.vehicle_type;

        // Check if Driver and Vehicle Type Matches
        if (driverVehicleType !== vehicleType) {
            return responseHandler.returnErrorMessage(res, `Driver not exists for the selected vehicle`);
        }

        // Fetch Total Travel Time from Stops Table
        const travelTimeQuery = `SELECT SUM(time) AS total_travel_time FROM ${LIVE_DB}.${STOPS_TABLE} WHERE route_id = ?`;
        const travelTimeResult = await db.RunQuery(LIVE_DB, travelTimeQuery, [route_id]);
        const totalTravelTime = parseFloat(travelTimeResult[0]?.total_travel_time) || 0;

        // Fetch Additional End Time from Routes Table
        const routeQuery = `SELECT end_time FROM ${LIVE_DB}.${ROUTES_TABLE} WHERE id = ?`;
        const routeResult = await db.RunQuery(LIVE_DB, routeQuery, [route_id]);
        const additionalEndTime = parseFloat(routeResult[0]?.end_time) || 0;

        // Calculate end_time
        const totalMinutesToAdd = totalTravelTime + additionalEndTime;
        const end_time = moment(start_time, "YYYY-MM-DD HH:mm:ss")
            .add(totalMinutesToAdd, 'minutes')
            .format("YYYY-MM-DD HH:mm:ss");

        const checkQuery = `
        SELECT 1 FROM ${LIVE_DB}.${BUS_DRIVER_ASSIGN_TABLE}
        WHERE operator_id = ? 
        AND (vehicle_id = ? OR driver_id = ?) 
        AND is_active = 1
        AND NOT (drop_time <= ? OR start_time >= ?)
        LIMIT 1
    `;

        const existingAssignment = await db.RunQuery(LIVE_DB, checkQuery, [operatorId, vehicle_id, driver_id, start_time, end_time]);

        if (existingAssignment.length > 0) {
            return responseHandler.returnErrorMessage(res, `Bus or Driver is already assigned during the selected period.`);
        }

        // Insert into Bus Route Management Table
        const insertQuery = `
            INSERT INTO ${LIVE_DB}.${BUS_DRIVER_ASSIGN_TABLE} 
            (operator_id, city_id, vehicle_id, driver_id, route_id, start_time, drop_time, service_type, is_active, vehicle_type, route_end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.RunQuery(LIVE_DB, insertQuery, [operatorId, city_id, vehicle_id, driver_id, route_id, start_time, end_time, requestRideType, 1, vehicleType, route_end_time]);

        return responseHandler.success(req, res, 'Bus assigned successfully', { route_id, start_time, end_time });
    } catch (error) {
        errorHandler.errorHandler(error, req, res);
    }
};

exports.fetchBookedBuses = async function (req, res) {
    try {
        let { city_id, vehicle_type,  start_date,  end_date, sSearch = '', iDisplayLength = 50, iDisplayStart = 0 } = req.query;

        let operatorId = req.operator_id;

        delete req.query.token;

        // Validation Schema
        const schema = Joi.object({
            city_id: Joi.number().required(),
            vehicle_type: Joi.string().required(),
            start_date: Joi.string().required(), // Format: "YYYY-MM-DD HH:mm:ss"
            end_date: Joi.string().optional().allow(null, ''), // Optional
            sSearch: Joi.string().allow('').optional(),
            iDisplayLength: Joi.number().integer().optional(),
            iDisplayStart: Joi.number().integer().optional()
        });

        const { error } = schema.validate(req.query);
        if (error) return responseHandler.parameterMissingResponse(res, 'Invalid parameters');

        const limit = Number(iDisplayLength);
        const offset = Number(iDisplayStart);
        const searchKeyword = `%${sSearch}%`;

        let baseQuery = `SELECT 
                            vh.vehicle_id,
                            vh.vehicle_name,
                            vh.vehicle_type,
                            vm.model_name,
                            bd.driver_id,
                            bd.route_id,
                            bd.start_time,
                            bd.drop_time,
                            bd.route_end_time,
                            vr.start_location_name,
                            vr.end_location_name,
                            vh.vehicle_name,
                            vh.vehicle_no AS vehicle_number,
                            vh.vehicle_image,
                            vr.end_location_name
                        FROM 
                            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BUS_DRIVER_ASSIGN_TABLE} bd
                        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLES} vh
                            ON bd.vehicle_id = vh.vehicle_id
                        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_MAKE_CUSTOMISATION} vc
                            ON vh.vehicle_make_id = vc.id
                        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_MAKE} vm
                            ON vc.model_id = vm.id
                        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.ROUTES_TABLE} vr
                            ON bd.route_id = vr.id
                        WHERE 
                            bd.operator_id = ? 
                            AND bd.is_active = 1
                            AND vm.city_id = ?
                            AND vm.is_active = 1
                            AND vh.vehicle_type IN (${vehicle_type})
                            AND bd.start_time >= ?`; // Fetch all starting from start_date

        let params = [operatorId, city_id, start_date];

        // Apply `end_date` filter only if provided
        if (end_date) {
            baseQuery += ` AND (
                                (bd.start_time <= ?) OR  -- Start time within range
                                (bd.route_end_time >= ? AND bd.route_end_time <= ?) OR  -- Drop time within range
                                (bd.start_time <= ? AND bd.route_end_time >= ?)    -- Booking spans entire period
                            )`;
         params.push(end_date, start_date, end_date, start_date, end_date);
        }

        if (sSearch) {
            baseQuery += ` AND (vh.vehicle_name LIKE ? OR vm.model_name LIKE ? OR bd.route_id LIKE ?)`;
            params.push(searchKeyword, searchKeyword, searchKeyword);
        }

        baseQuery += ` ORDER BY bd.start_time ASC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const bookedBuses = await db.RunQuery(dbConstants.DBS.LIVE_DB, baseQuery, params);

        return responseHandler.success(req, res, 'Booked buses fetched successfully', bookedBuses);
    } catch (error) {
        errorHandler.errorHandler(error, req, res);
    }
};

exports.editAssignedBus = async function (req, res) {
    try {
        const { assignment_id, vehicle_id, driver_id, start_time, route_id, city_id, route_end_time } = req.body;
        const { operator_id: operatorId, request_ride_type: requestRideType } = req;

        // **Validation Schema**
        const schema = Joi.object({
            assignment_id: Joi.number().required(),
            vehicle_id: Joi.number().required(),
            driver_id: Joi.number().optional(),
            start_time: Joi.string().optional(), // Format: "YYYY-MM-DD HH:mm:ss"
            route_end_time: Joi.string().optional(), // Format: "YYYY-MM-DD HH:mm:ss"
            city_id: Joi.number().required(),
            route_id: Joi.number().optional()
        });

        delete req.body.token;
        const { error } = schema.validate(req.body);
        if (error) return responseHandler.parameterMissingResponse(res, '');

        // Database Constants
        const { LIVE_DB } = dbConstants.DBS;
        const { STOPS_TABLE, ROUTES_TABLE, BUS_DRIVER_ASSIGN_TABLE, CAPTAINS, VEHICLES } = dbConstants.LIVE_DB;

        // **Check if Assignment Exists**
        const existingAssignmentQuery = `
            SELECT * FROM ${LIVE_DB}.${BUS_DRIVER_ASSIGN_TABLE}
            WHERE id = ? AND operator_id = ? AND city_id = ?
        `;
        const existingAssignment = await db.RunQuery(LIVE_DB, existingAssignmentQuery, [assignment_id, operatorId, city_id]);
        if (existingAssignment.length == 0) {
            return responseHandler.returnErrorMessage(res, `Assignment not found`);
        }

        // **Fetch Driver Details**
        const driverQuery = `SELECT vehicle_type FROM ${LIVE_DB}.${CAPTAINS} WHERE driver_id = ?`;
        const driverResult = await db.RunQuery(LIVE_DB, driverQuery, [driver_id]);
        if (driverResult.length == 0) {
            return responseHandler.returnErrorMessage(res, `Driver not found`);
        }
        const driverVehicleType = driverResult[0]?.vehicle_type;

        // **Fetch Vehicle Details**
        const vehicleQuery = `SELECT vehicle_type FROM ${LIVE_DB}.${VEHICLES} WHERE vehicle_id = ?`;
        const vehicleResult = await db.RunQuery(LIVE_DB, vehicleQuery, [vehicle_id]);
        if (vehicleResult.length == 0) {
            return responseHandler.returnErrorMessage(res, `Vehicle not found`);
        }
        const vehicleType = vehicleResult[0]?.vehicle_type;

        // **Check if Driver and Vehicle Type Matches**
        if (driverVehicleType !== vehicleType) {
            return responseHandler.returnErrorMessage(res, `Driver does not match the selected vehicle`);
        }

        // **Fetch Total Travel Time from Stops Table**
        const travelTimeQuery = `SELECT SUM(time) AS total_travel_time FROM ${LIVE_DB}.${STOPS_TABLE} WHERE route_id = ?`;
        const travelTimeResult = await db.RunQuery(LIVE_DB, travelTimeQuery, [route_id]);
        const totalTravelTime = parseFloat(travelTimeResult[0]?.total_travel_time) || 0;

        // **Fetch Additional End Time from Routes Table**
        const routeQuery = `SELECT end_time FROM ${LIVE_DB}.${ROUTES_TABLE} WHERE id = ?`;
        const routeResult = await db.RunQuery(LIVE_DB, routeQuery, [route_id]);
        const additionalEndTime = parseFloat(routeResult[0]?.end_time) || 0;

        // **Calculate New `drop_time`**
        const totalMinutesToAdd = totalTravelTime + additionalEndTime;
        const drop_time = moment(start_time, "YYYY-MM-DD HH:mm:ss")
            .add(totalMinutesToAdd, 'minutes')
            .format("YYYY-MM-DD HH:mm:ss");

        // **Check for Schedule Conflicts**
        const conflictCheckQuery = `
            SELECT 1 FROM ${LIVE_DB}.${BUS_DRIVER_ASSIGN_TABLE}
            WHERE operator_id = ? 
            AND (vehicle_id = ? OR driver_id = ?) 
            AND is_active = 1
            AND id != ?  -- Exclude current assignment
            AND NOT (drop_time <= ? OR start_time >= ?)
            AND service_type = ?
            LIMIT 1
        `;
        const conflictExists = await db.RunQuery(LIVE_DB, conflictCheckQuery, [operatorId, vehicle_id, driver_id, assignment_id, start_time, drop_time, requestRideType]);
        if (conflictExists.length > 0) {
            return responseHandler.returnErrorMessage(res, `Bus or Driver is already assigned during the selected period.`);
        }

        // **Update the Assignment**
        const updateFields = [];
        const updateValues = [];

        if (route_id) {
            updateFields.push("route_id = ?");
            updateValues.push(route_id);
        }
        if (driver_id) {
            updateFields.push("driver_id = ?");
            updateValues.push(driver_id);
        }
        if (start_time) {
            updateFields.push("start_time = ?");
            updateValues.push(start_time);
        }
        if (drop_time) {
            updateFields.push("drop_time = ?");
            updateValues.push(drop_time);
        }
        if (route_end_time) {
            updateFields.push("route_end_time = ?");
            updateValues.push(route_end_time);
        }

        if (updateFields.length > 0) {
            const updateQuery = `
                UPDATE ${LIVE_DB}.${BUS_DRIVER_ASSIGN_TABLE}
                SET ${updateFields.join(", ")}
                WHERE id = ? AND operator_id = ? AND city_id = ?
            `;
            updateValues.push(assignment_id, operatorId, city_id);
            await db.RunQuery(LIVE_DB, updateQuery, updateValues);
        }

        return responseHandler.success(req, res, 'Bus assignment updated successfully', { assignment_id, route_id, start_time, drop_time });
    } catch (error) {
        errorHandler.errorHandler(error, req, res);
    }
};