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
            secret_key: Joi.number().optional()
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
      ORDER BY 
        added_in_city DESC`;

        const values = [cityId, vehicleType, operatorId, cityId];

        const docWrapper = await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            stmt,
            values,
        );

      return responseHandler.success(req,res, '',docWrapper);
    } catch (error) {
      errorHandler.errorHandler(error, req, res);
    }
  };