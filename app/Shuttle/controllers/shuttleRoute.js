const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants
} = require('../../../bootstart/header');
var Joi = require('joi');


exports.insertRoute = async function (req, res) {
  let response = {};
  try {
    let body = req.body;
    let operatorId = req.operator_id
    delete body.token;

    // **Validation Schema**
    const schema = Joi.object({
      city_id: Joi.number().integer().required(),
      route_name: Joi.string().required(),
      start_location_name: Joi.string().required(),
      start_latitude: Joi.number().required(),
      start_longitude: Joi.number().required(),
      end_location_name: Joi.string().required(),
      end_latitude: Joi.number().required(),
      end_longitude: Joi.number().required(),
      end_distance: Joi.number().required(),
      end_time: Joi.number().required(),
      halt_points: Joi.array().items(
        Joi.object({
          location_name: Joi.string().required(),
          latitude: Joi.number().required(),
          longitude: Joi.number().required(),
          distance: Joi.number().required(),
          time: Joi.number().required(),
          waiting_time: Joi.number().required()
        })
      ).min(0).optional()
    });

    const result = schema.validate(body);
    if (result.error) {
      response = {
        flag: ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING,
        message: 'Params missing or invalid',
      };
      return res.send(response);
    }

    // **Insert Route into `tb_fr_routes`**
    const routeQuery = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.ROUTES_TABLE} (operator_id, city_id, route_name,  start_location_name, start_latitude, start_longitude, end_location_name, end_latitude, end_longitude, is_active, distance, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,)`;
    const routeValues = [operatorId, body.city_id, body.route_name, body.start_location_name, body.start_latitude, body.start_longitude, body.end_location_name, body.end_latitude, body.end_longitude, 1, body.end_distance, body.end_time];

    const routeResult = await db.RunQuery(dbConstants.DBS.LIVE_DB, routeQuery, routeValues);

    const routeId = routeResult.insertId;

    // **Insert Halt Points into `tb_fr_stops`**
    if (body.halt_points && body.halt_points.length > 0) {
      const haltQuery = `
              INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE} (operator_id, city_id, is_active, route_id, location_name, latitude, longitude, distance, time, waiting_time)
              VALUES ?`;
      const haltValues = body.halt_points.map(halt => [
        operatorId, body.city_id, 1, routeId, halt.location_name, halt.latitude, halt.longitude, halt.distance, halt.time, halt.waiting_time
      ]);
      await db.RunQuery(dbConstants.DBS.LIVE_DB, haltQuery, [haltValues]);
    }

    responseHandler.success(req, res, 'Route inserted successfully', { route_id: routeId });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};