const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
    rideConstants
} = require('../../../bootstart/header');
var Joi = require('joi');


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
                          vh.vehicle_type = ?
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
