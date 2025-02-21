const Joi = require('joi');
const crypto = require('crypto');
const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
} = require('../../../bootstart/header');
const { checkBlank } = require('../../rides/helper');

// Utility function to validate mandatory fields
const validateMandatoryFields = (fields, res) => {
  if (checkBlank(fields)) {
    responseHandler.parameterMissingResponse(res, '');
    return false;
  }
  return true;
};

// Utility function to check if a fleet already exists
const checkFleetExists = async (db, table, conditions, values) => {
  const query = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${table} WHERE ${conditions.join(' AND ')}`;
  const result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);
  return result.length > 0;
};

// Create Fleet
exports.createFleet = async (req, res) => {
  try {
    const { city_id, fleet_name, email, description, password } = req.body;
    const { operator_id, request_ride_type } = req;

    const mandatoryFields = [city_id, operator_id, fleet_name, email, description, password, request_ride_type];
    if (!validateMandatoryFields(mandatoryFields, res)) return;

    const fleetConditions = [
      { field: 'email', value: email },
      { field: 'name', value: fleet_name },
    ];

    for (const condition of fleetConditions) {
      const exists = await checkFleetExists(db, dbConstants.LIVE_DB.FLEET_TABLE, [
        `${condition.field} = ?`,
        'operator_id = ?',
        'city_id = ?',
        'service_type = ?',
      ], [condition.value, operator_id, city_id, request_ride_type]);

      if (exists) {
        return responseHandler.returnErrorMessage(res, `Fleet with this ${condition.field} already exists`);
      }
    }

    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
    const query = `
      INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.FLEET_TABLE} 
      (name, operator_id, city_id, description, password, is_active, service_type, email) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [fleet_name, operator_id, city_id, description, hashedPassword, 1, request_ride_type, email];

    await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);
    return responseHandler.success(req, res, 'Fleet added successfully.', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

// Fetch Fleet List
exports.fetchFleetList = async (req, res) => {
  try {
    const { city_id, sSortDir_0, is_active, iDisplayLength, iDisplayStart, sSearch } = req.query;
    const { operator_id = 1, request_ride_type } = req;

    delete req.query.token

    const schema = Joi.object({
      city_id: Joi.number().integer().optional(),
      sSortDir_0: Joi.string().optional(),
      is_active: Joi.number().integer().optional(),
      iDisplayLength: Joi.number().integer().optional(),
      iDisplayStart: Joi.number().integer().optional(),
      sSearch: Joi.string().allow('').optional(),
    });

    const { error } = schema.validate(req.query);
    if (error) return responseHandler.parameterMissingResponse(res, '');

    const orderDirection = sSortDir_0?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const limit = Number(iDisplayLength || 50);
    const offset = Number(iDisplayStart || 0);

    const baseQuery = `
      SELECT ft.id, ft.name, ft.operator_id, ft.city_id, ft.description, ft.is_active, ft.service_type, ft.created_at,
      ft.email, COUNT(dr.driver_id) AS total_drivers
      FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.FLEET_TABLE} ft
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} dr ON dr.fleet_id = ft.id AND dr.verification_status = 1
    `;

    const queryConditions = [
      'ft.operator_id = ?',
      'ft.city_id = ?',
      'ft.service_type = ?',
    ];
    const values = [operator_id, city_id, request_ride_type];

    if (sSearch) {
      queryConditions.push('ft.name LIKE ?');
      values.push(`%${sSearch}%`);
    }

    if (is_active !== undefined) {
      queryConditions.push('ft.is_active = ?');
      values.push(is_active);
    }

    const whereClause = queryConditions.length ? `WHERE ${queryConditions.join(' AND ')}` : '';
    const getFleetsQuery = `
      ${baseQuery}
      ${whereClause}
      GROUP BY ft.id
      ORDER BY ft.created_at ${orderDirection}
      LIMIT ? OFFSET ?
    `;
    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.FLEET_TABLE} ft
      ${whereClause}
    `;

    const [fleetDetails, fleetCount] = await Promise.all([
      db.RunQuery(dbConstants.DBS.LIVE_DB, getFleetsQuery, values),
      db.RunQuery(dbConstants.DBS.LIVE_DB, countQuery, values.slice(0, -2)),
    ]);

    return responseHandler.success(req, res, '', {
      result: fleetDetails,
      iTotalRecords: fleetCount[0]?.total || 0,
    });
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

// Edit Fleet
exports.editFleet = async (req, res) => {
  try {
    const { fleet_id, name, is_active, description, email } = req.body;

    const schema = Joi.object({
      fleet_id: Joi.string().required(),
      name: Joi.string().optional(),
      is_active: Joi.number().valid(0, 1).optional(),
      description: Joi.string().optional(),
      email: Joi.string().optional(),
    });
    
    delete req.body.token

    const { error } = schema.validate(req.body);
    if (error) return responseHandler.parameterMissingResponse(res, '');

    const updateFields = [];
    const values = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }
    // if (email !== undefined) {
    //   updateFields.push('email = ?');
    //   values.push(email);
    // }
    if (is_active !== undefined) {
      const checkDriversQuery = `
      SELECT COUNT(*) AS driver_count
      FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS}
      WHERE fleet_id = ?
    `;
      const [driverCountResult] = await db.RunQuery(dbConstants.DBS.LIVE_DB, checkDriversQuery, [fleet_id]);
      if (driverCountResult.driver_count > 0) {
        return responseHandler.returnErrorMessage(res, `Fleet has associated drivers, cannot mark it as disable.`);
      } else {
        updateFields.push('is_active = ?');
        values.push(is_active);
      }
    }

    if (updateFields.length === 0) {
      return responseHandler.parameterMissingResponse(res, 'No fields to update');
    }

    values.push(fleet_id);
    const updateQuery = `
      UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.FLEET_TABLE}
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const result = await db.RunQuery(dbConstants.DBS.LIVE_DB, updateQuery, values);
    if (result.affectedRows === 0) {
      return responseHandler.returnErrorMessage(res, `Fleet not found`);
    }

    return responseHandler.success(req, res, 'Fleet updated successfully', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

// Delete Fleet
exports.deleteFleet = async (req, res) => {
  try {
    const { fleet_id } = req.body;

    const schema = Joi.object({
      fleet_id: Joi.string().required(),
    });

    delete req.body.token
    const { error } = schema.validate(req.body);
    if (error) return responseHandler.parameterMissingResponse(res, '');

    const checkDriversQuery = `
      SELECT COUNT(*) AS driver_count
      FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS}
      WHERE fleet_id = ?
    `;
    const [driverCountResult] = await db.RunQuery(dbConstants.DBS.LIVE_DB, checkDriversQuery, [fleet_id]);

    if (driverCountResult.driver_count > 0) {
      return responseHandler.returnErrorMessage(res, `Cannot delete fleet: Fleet has associated drivers`);
    }

    const deleteQuery = `
      DELETE FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.FLEET_TABLE}
      WHERE id = ?
    `;
    const result = await db.RunQuery(dbConstants.DBS.LIVE_DB, deleteQuery, [fleet_id]);

    if (result.affectedRows === 0) {
      return responseHandler.returnErrorMessage(res, `Fleet not found`);
    }

    return responseHandler.success(req, res, 'Fleet deleted successfully', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};