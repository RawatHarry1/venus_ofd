const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  rideConstants,
  ResponseConstants,
  generalConstants,
} = require('../../../bootstart/header');
var moment = require('moment');
var Joi = require('joi');
const Helper = require('../helper');
const rideConstant = require('../../../constants/rideConstants');
const { checkBlank } = require('../../rides/helper');

exports.fetchCityDocuments = async function (req, res) {
  try {
    const requestParameters = req.query;
    delete requestParameters.token;

    const validationSchema = Joi.object({
      city: Joi.number().integer().min(1).required(),
      vehicle_type: Joi.number().integer().min(1).required(),
      secret_key: Joi.number().optional(),
    });
    const validatedParams = validationSchema.validate(requestParameters);

    if (validatedParams.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    const cityId = requestParameters.city;
    const vehicleType = requestParameters.vehicle_type;
    const operatorId = req.operator_id;

    const stmt = `SELECT 
        rd.document_id, 
        rd.document_name,
        rd.instructions,
        rd.num_images_required,
        rd.gallery_restricted,
        rd.document_category,
        rd.document_type,
        cd.is_required,
        CASE WHEN cd.is_active = 0
            THEN 0 
            ELSE 1 
            END
        as added_in_city,
        CASE WHEN cd.city_id IS NULL OR cd.city_id = 0
            THEN 0
            ELSE 1
            END
        as is_editable     
      FROM 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd 
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd ON rd.document_id = cd.document_id 
        AND cd.city_id IN (0, ?) 
        AND cd.vehicle_type = ?
      WHERE 
        rd.operator_id = ?
        and cd.city_id IN(0, ?)
        and cd.is_active = 1
      ORDER BY 
        added_in_city DESC`;

    const values = [cityId, vehicleType, operatorId, cityId];

    const docWrapper = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, values);

    return responseHandler.success(req, res, '', docWrapper);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.insertDocument = async function (req, res) {
  try {
    const schema = Joi.object({
      operator_id: Joi.number().integer().optional(),
      document_name: Joi.string().required(),
      num_images_required: Joi.number().integer().optional(),
      city_id: Joi.number().integer().required(),
      vehicle_type: Joi.number().integer().required(),
      is_required: Joi.number().integer().required(),
      document_type: Joi.number().integer().required(),
      gallery_restricted: Joi.number().integer().optional(),
      instructions: Joi.string().optional(),
      document_category: Joi.number().integer().min(0).max(2).optional(),
      bank_details: Joi.optional(),
      include_expiry: Joi.optional(),
      text_doc_category: Joi.optional(),
      secret_key: Joi.number().optional(),
    });

    delete req.body.token;

    const result = schema.validate(req.body);
    var response = {};

    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    const body = req.body;
    body.operator_id = req.operator_id;

    if (body.document_type == 4 && !body.text_doc_category) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    if (req.multipleVehicleEnable) {
      //if(constants.multipleVehiclesEnabledOperators.indexOf(body.operator_id) >= 0 ){

      //Document Category is mandatory when multiple Vehicles are enabled for operator
      if (!body.document_category) {
        return responseHandler.parameterMissingResponse(res, '');
      } else {
        if (
          body.is_required !=
          constants.driverDocumentIsRequired.MANDATORY_REGISTER
        ) {
          throw new Error(
            'Invalid Required field. Only Mandatory Register is allowed for Vehicle Documents',
          );
        }
      }
    } else {
      //Document Category is not allowed when multiple Vehicles is not enabled for operator
      if (body.document_category) {
        return responseHandler.parameterMissingResponse(res, '');
      }
    }

    var requiredVehicleKeys = ['*'];
    var vehicleCriteria = [
      { key: 'vehicle_type', value: body.vehicle_type },
      { key: 'operator_id', value: body.operator_id || req.operator_id || 0 },
      { key: 'city_id', value: body.city_id },
    ];
    var vehicleValues = {};
    vehicleValues = await db.SelectFromTableIn(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
      requiredVehicleKeys,
      vehicleCriteria,
    );
    if (!vehicleValues || !vehicleValues.length) {
      throw new Error('Vehicle Type is not valid.');
    }

    var requiredKeys = ['document_id'];
    var criteria = [
      { key: 'operator_id', value: body.operator_id },
      { key: 'document_name', value: body.document_name },
      { key: 'document_type', value: body.document_type },
    ];

    var resultWrapper = {};

    resultWrapper = await db.SelectFromTableIn(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC}`,
      requiredKeys,
      criteria,
    );

    if (body.document_type == 4) body.num_images_required = '0';

    var document = await Helper.insertRequiredDocument(body);

    body.document_id = document;

    await Helper.insertCityDocument(body);

    return responseHandler.success(
      req,
      res,
      'Document added successfully.',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateDocument = async function (req, res) {
  try {
    req.body.operator_id = req.operator_id;
    const schema = Joi.object({
      operator_id: Joi.number().integer().required(),
      document_id: Joi.number().integer().required(),
      city_id: Joi.number().integer().min(0).optional(),
      document_name: Joi.string().optional(),
      instructions: Joi.string().allow('').optional(),
      num_images_required: Joi.number().integer().optional(),
      gallery_restricted: Joi.number().integer().valid(0, 1).optional(),
      change_status: Joi.number().integer().valid(1).optional(),
      vehicle_type: Joi.number().integer().min(1).optional(),
      secret_key: Joi.number().optional(),
      is_required: Joi.number().integer().min(0).optional(),
    })
      .with('change_status', ['city_id', 'vehicle_type'])
      .with('is_required', ['city_id', 'vehicle_type'])
      .without('city_id', [
        'document_name',
        'instructions',
        'num_images_required',
        'gallery_restricted',
      ])
      .without('vehicle_type', [
        'document_name',
        'instructions',
        'num_images_required',
        'gallery_restricted',
      ])
      .or(
        'document_name',
        'instructions',
        'num_images_required',
        'change_status',
        'is_required',
        'gallery_restricted',
      )
      .min(3);

    delete req.body.token;

    var response = {};
    var result = schema.validate(req.body);

    if (result.error) {
      return responseHandler.parameterMissingResponse(res, result.error);
    }

    const body = req.body;

    var requiredKeys = ['document_name'];
    var criteria = [
      { key: 'document_id', value: body.document_id },
      { key: 'operator_id', value: body.operator_id },
    ];
    var prevDocValues = {};

    prevDocValues = await db.SelectFromTableIn(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC}`,
      requiredKeys,
      criteria,
    );
    if (!(prevDocValues && prevDocValues.length)) {
      throw new Error('No such document found.');
    }

    if (body.change_status || body.is_required >= 0) {
      var requiredDocumentQuery = `UPDATE
       ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd
      on cd.document_id = rd.document_id
   SET `;
      var values = [];
      if (body.change_status) {
        requiredDocumentQuery += `cd.is_active = ?`;
        values.push(rideConstants.STATUS.INACTIVE);
      }
      if (body.is_required >= 0) {
        requiredDocumentQuery +=
          (body.change_status ? ',' : '') + `cd.is_required = ?`;
        values.push(body.is_required);
      }

      requiredDocumentQuery += ` WHERE rd.operator_id = ? AND cd.document_id = ? AND cd.city_id = ? AND cd.vehicle_type = ?`;

      values = values.concat([
        body.operator_id,
        body.document_id,
        body.city_id,
        body.vehicle_type,
      ]);
      await db.RunQuery(dbConstants.DBS.LIVE_DB, requiredDocumentQuery, values);
    } else {
      var criteria = [{ key: 'document_id', value: body.document_id }];
      var updateKeys = {};
      if (body.document_name) {
        updateKeys.document_name = body.document_name;
      }
      if ('instructions' in body) {
        updateKeys.instructions = body.instructions;
      }
      if (body.num_images_required) {
        updateKeys.num_images_required = body.num_images_required;
      }
      if (body.gallery_restricted) {
        updateKeys.gallery_restricted = body.gallery_restricted;
      }

      await db.updateTable(
        dbConstants.DBS.LIVE_DB,
        `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC}`,
        updateKeys,
        criteria,
      );
    }
    return responseHandler.success(
      req,
      res,
      'Document updated successfully.',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
