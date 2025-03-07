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
      route_description: Joi.string().required(),
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
    const routeQuery = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.ROUTES_TABLE} (operator_id, city_id, route_name,  start_location_name, start_latitude, start_longitude, end_location_name, end_latitude, end_longitude, is_active, distance, time, route_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const routeValues = [operatorId, body.city_id, body.route_name, body.start_location_name, body.start_latitude, body.start_longitude, body.end_location_name, body.end_latitude, body.end_longitude, 1, body.end_distance, body.end_time, body.route_description];

    const routeResult = await db.RunQuery(dbConstants.DBS.LIVE_DB, routeQuery, routeValues);

    const routeId = routeResult.insertId;

    // **Insert Halt Points into `tb_fr_stops`**
    if (body.halt_points && body.halt_points.length > 0) {
      const haltQuery = `
        INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE} 
        (operator_id, city_id, is_active, route_id, location_name, latitude, longitude, distance, time, waiting_time)
        VALUES ${body.halt_points.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
      `;
    
      const haltValues = body.halt_points.flatMap(halt => [
        operatorId, body.city_id, 1, routeId, halt.location_name, halt.latitude, halt.longitude, halt.distance, halt.time, halt.waiting_time
      ]);
    
      await db.RunQuery(dbConstants.DBS.LIVE_DB, haltQuery, haltValues);
    }
    

    return responseHandler.success(req, res, 'Route inserted successfully', { route_id: routeId });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchRouteList = async function (req, res) {
  try {
    let { is_active = 1, iDisplayLength, iDisplayStart, sSearch } = req.query;
    let operatorId = req.operator_id;

    delete req.query.token;

    // **Validation Schema**
    const schema = Joi.object({
      city_id: Joi.number().required(),
      is_active: Joi.number().integer().optional(),
      iDisplayLength: Joi.number().integer().optional(),
      iDisplayStart: Joi.number().integer().optional(),
      sSearch: Joi.string().allow('').optional(),
    });

    const { error } = schema.validate(req.query);
    if (error) return responseHandler.parameterMissingResponse(res, '');

    const limit = Number(iDisplayLength || 50);
    const offset = Number(iDisplayStart || 0);

    // **Base Route Query**
    const baseQuery = `
      SELECT r.id AS route_id, r.route_name, r.city_id, r.start_location_name, r.end_location_name, 
             r.start_latitude, r.start_longitude, r.end_latitude, r.end_longitude, 
             r.end_distance, r.end_time , r.is_active, r.created_at, r.route_description
      FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.ROUTES_TABLE} r
    `;

    // **Conditions & Values**
    const queryConditions = ['r.operator_id = ?'];
    const values = [operatorId];

    if (is_active !== undefined) {
      queryConditions.push('r.is_active = ?');
      values.push(is_active);
    }

    if (sSearch) {
      queryConditions.push('(r.route_name LIKE ? OR r.start_location_name LIKE ? OR r.end_location_name LIKE ?)');
      values.push(`%${sSearch}%`, `%${sSearch}%`, `%${sSearch}%`);
    }

    const whereClause = queryConditions.length ? `WHERE ${queryConditions.join(' AND ')}` : '';

    // **Final Route Query**
    const getRoutesQuery = `
      ${baseQuery}
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    values.push(limit, offset);

    // **Count Query**
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.ROUTES_TABLE} r
      ${whereClause}
    `;

    const [routes, routeCount] = await Promise.all([
      db.RunQuery(dbConstants.DBS.LIVE_DB, getRoutesQuery, values),
      db.RunQuery(dbConstants.DBS.LIVE_DB, countQuery, values.slice(0, -2)), // Remove limit & offset
    ]);

    if (!routes.length) {
      return responseHandler.success(req, res, 'No routes found', { result: [], iTotalRecords: 0 });
    }

    // **Fetch Halt Points for Each Route**
    const routeIds = routes.map(route => route.route_id);
    const haltQuery = `
      SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE}
      WHERE operator_id = ? AND route_id IN (${routeIds.map(() => '?').join(',')}) AND is_active = ?
    `;
    const haltValues = [operatorId, ...routeIds, is_active];

    const haltPoints = await db.RunQuery(dbConstants.DBS.LIVE_DB, haltQuery, haltValues);

    // **Map Halt Points to Routes**
    const haltMap = {};
    haltPoints.forEach(halt => {
      if (!haltMap[halt.route_id]) haltMap[halt.route_id] = [];
      haltMap[halt.route_id].push(halt);
    });

    routes.forEach(route => {
      route.halt_points = haltMap[route.route_id] || [];
    });

    return responseHandler.success(req, res, 'Routes fetched successfully', {
      result: routes,
      iTotalRecords: routeCount[0]?.total || 0,
    });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.editRoute = async function (req, res) {
  let response = {};
  try {
    let body = req.body;
    let operatorId = req.operator_id;
    delete body.token;

    // **Validation Schema**
    const schema = Joi.object({
      route_id: Joi.number().required(),
      city_id : Joi.number().required(),
      route_name: Joi.string().optional(),
      route_description: Joi.string().optional(),
      start_location_name: Joi.string().optional(),
      start_latitude: Joi.number().optional(),
      start_longitude: Joi.number().optional(),
      end_location_name: Joi.string().optional(),
      end_latitude: Joi.number().optional(),
      end_longitude: Joi.number().optional(),
      end_distance: Joi.number().optional(),
      end_time: Joi.number().optional(),
      halt_points: Joi.array().items(
        Joi.object({
          stop_id: Joi.number().optional(),  // Only present for existing stops
          location_name: Joi.string().required(),
          latitude: Joi.number().required(),
          longitude: Joi.number().required(),
          distance: Joi.number().required(),
          time: Joi.number().required(),
          waiting_time: Joi.number().required()
        })
      ).optional(),
      id_to_delete: Joi.array().items(Joi.number()).optional()
    });

    let idToDelete = body.id_to_delete;

    delete body.id_to_delete;
    const { error } = schema.validate(body);
    if (error) return responseHandler.parameterMissingResponse(res, '');

    // **Build Dynamic Query for Route Update**
    let updateFields = [];
    let updateValues = [];

    Object.keys(body).forEach(key => {
      if (key !== 'halt_points' && key !== 'route_id') {
        updateFields.push(`${key} = ?`);
        updateValues.push(body[key]);
      }
    });

    if (updateFields.length > 0) {
      const routeUpdateQuery = `
        UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.ROUTES_TABLE}
        SET ${updateFields.join(", ")}
        WHERE operator_id = ? AND id = ? AND city_id = ?
      `;
      updateValues.push(operatorId, body.route_id, body.city_id);
      await db.RunQuery(dbConstants.DBS.LIVE_DB, routeUpdateQuery, updateValues);
    }

    // // **Fetch Existing Halt Points**
    // const existingHaltQuery = `
    //   SELECT id FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE}
    //   WHERE operator_id = ? AND route_id = ?
    // `;
    // const existingHalts = await db.RunQuery(dbConstants.DBS.LIVE_DB, existingHaltQuery, [operatorId, body.route_id]);
    // const existingHaltIds = existingHalts.map(halt => halt.stop_id);

    // **Prepare Halt Points for Update, Insert, and Delete**
    // let newHaltIds = body.halt_points?.map(halt => halt.stop_id).filter(id => id) || [];
    // let haltPointsToDelete = existingHaltIds.filter(id => !newHaltIds.includes(id));

    // **Update Existing Halt Points**
    if (body.halt_points) {
      for (const halt of body.halt_points) {
        if (halt.stop_id) {
          const updateHaltQuery = `
            UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE}
            SET location_name = ?, latitude = ?, longitude = ?, distance = ?, time = ?, waiting_time = ?
            WHERE operator_id = ? AND id = ? AND city_id = ?
          `;
          const updateHaltValues = [
            halt.location_name, halt.latitude, halt.longitude, halt.distance, halt.time, halt.waiting_time,
            operatorId, halt.stop_id, body.city_id
          ];
          await db.RunQuery(dbConstants.DBS.LIVE_DB, updateHaltQuery, updateHaltValues);
        }
      }
    }

    if(idToDelete && idToDelete.length > 0) {
      const deleteHaltQuery = `
        DELETE FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE}
        WHERE operator_id = ? AND id IN (${idToDelete.map(() => '?').join(", ")}) AND city_id = ?
      `;
      const deleteHaltValues = [operatorId, ...idToDelete, body.city_id];
      await db.RunQuery(dbConstants.DBS.LIVE_DB, deleteHaltQuery, deleteHaltValues);
    }

    // **Insert New Halt Points**
    const newHaltPoints = body.halt_points?.filter(halt => !halt.stop_id) || [];
    if (newHaltPoints.length > 0) {
      const insertHaltQuery = `
        INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE}
        (operator_id, city_id, is_active,location_name, route_id, latitude, longitude, distance, time, waiting_time)
        VALUES ${newHaltPoints.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
      `;
      const insertHaltValues = newHaltPoints.flatMap(halt => [
        operatorId, body.city_id, 1, halt.location_name, body.route_id, halt.latitude, halt.longitude, halt.distance, halt.time, halt.waiting_time
      ]);
      await db.RunQuery(dbConstants.DBS.LIVE_DB, insertHaltQuery, insertHaltValues);
    }


    return responseHandler.success(req, res, 'Route updated successfully', { route_id: body.route_id });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.deleteRoute = async function (req, res) {
  let response = {};
  try {
    let { route_id } = req.body;
    let operatorId = req.operator_id;

    const schema = Joi.object({
      route_id: Joi.number().required(),
    });

    delete req.body.token
    const { error } = schema.validate(req.body);
    if (error) return responseHandler.parameterMissingResponse(res, '');

    // **Soft Delete Route**
    const routeQuery = `DELETE FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.ROUTES_TABLE}
    WHERE id = ?`
    await db.RunQuery(dbConstants.DBS.LIVE_DB, routeQuery, [route_id]);

    // **Soft Delete Halt Points**
    const haltQuery = `DELETE FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.STOPS_TABLE}
    WHERE route_id = ?`
    await db.RunQuery(dbConstants.DBS.LIVE_DB, haltQuery, [route_id]);

    return responseHandler.success(req, res, 'Route deleted successfully', { route_id });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};