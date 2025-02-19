const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
} = require('../../../bootstart/header');
const { checkBlank } = require('../../rides/helper');
const  Helper = require('../helper');
const crypto = require('crypto');

exports.createFleet = async function (req, res) {
  try {
    let opts = req.body;

    var response = {},
      cityId = opts.city_id,
      operatorId = req.operator_id,
      fleetName = opts.fleet_name,
      email = opts.email,
      description = opts.description,
      password = opts.password,
      mandatoryFields = [cityId, operatorId, fleetName, email, description, password];

    if (checkBlank(mandatoryFields)) {
      return responseHandler.parameterMissingResponse(res, '');
    }





     const hashedPassword = crypto.createHash('md5').update(password).digest('hex');


    let query = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS_TYPE} (banner_type, operator_id, city_id) VALUES (?, ?, ?)`;
    let params = [opts.banner_type, req.operator_id, opts.city_id];
    let result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);
    return responseHandler.success(
      req,
      res,
      'Banner type created successfully',
      result.insertId,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
