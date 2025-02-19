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

exports.fetchBannerTypes = async function (req, res) {
  try {
    let query;
    let values = [];

    if (!req.city) {
      throw new Error('city_id is required');
    }

    if (req.city == '1') {
      query = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS_TYPE}`;
    } else {
      query = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS_TYPE} WHERE operator_id = ? AND city_id = ?`;
      values.push(req.operator_id);
      values.push(req.city);
    }
    let result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);
    return responseHandler.success(req, res, '', result);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateBannerType = async function (req, res) {
  try {
    let opts = req.body;

    // Validate input
    if (!opts.banner_type || !opts.id) {
      throw new Error('Banner type and ID are required');
    }
    let query = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS_TYPE} SET banner_type = ? WHERE id = ? AND operator_id = ? AND city_id = ? `;
    let params = [opts.banner_type, opts.id, req.operator_id, opts.city_id];
    await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);
    return responseHandler.success(
      req,
      res,
      'Banner type updated successfully',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.deleteBannerType = async function (req, res) {
  try {
    let opts = req.body;
    let response = {};
    let query, params;

    // Validate input
    if (!opts.id) {
      throw new Error('Banner type ID is required');
    }
    query = `DELETE FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS} WHERE banner_type_id = ? AND operator_id = ? AND city_id = ?`;
    params = [opts.id, req.operator_id, opts.city_id];
    await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);

    query = `DELETE FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS_TYPE} WHERE id = ?`;
    params = [opts.id];
    await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);
    return responseHandler.success(
      req,
      res,
      'Banner type deleted successfully',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.createBanner = async function (req, res) {
  try {
    let opts = req.body;

    // Validate input
    if (!opts.banner_type_id || !opts.banner_image) {
      throw new Error('Banner type ID and banner image are required');
    }

    let query = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS} (banner_type_id, banner_image, is_active, banner_order, banner_redirected_url,operator_id,city_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    let params = [
      opts.banner_type_id,
      opts.banner_image,
      opts.is_active || 0,
      opts.banner_order || null,
      opts.banner_redirected_url || null,
      req.operator_id,
      opts.city_id,
    ];
    await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);
    return responseHandler.success(req, res, 'Banner created successfully', '');
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchBanners = async function (req, res) {
  try {
    let opts = req.body;
    if (!req.city) {
      throw new Error('Some parameter missing');
    }

    let query = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS} WHERE operator_id = ? AND city_id = ?`;
    let result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, [
      req.operator_id,
      req.city,
    ]);
    return responseHandler.success(req, res, '', result);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateBanner = async function (req, res) {
  try {
    let opts = req.body;
    if (!opts.id) {
      throw new Error('Banner ID is required');
    }
    if (!opts.city_id) {
      throw new Error('city_id is required');
    }

    let fields = [];
    let params = [];

    if (opts.banner_type_id !== undefined) {
      fields.push('`banner_type_id` = ?');
      params.push(opts.banner_type_id);
    }

    if (opts.banner_image !== undefined) {
      fields.push('`banner_image` = ?');
      params.push(opts.banner_image);
    }

    if (opts.is_active !== undefined) {
      fields.push('`is_active` = ?');
      params.push(opts.is_active);
    }

    if (opts.banner_order !== undefined) {
      fields.push('`banner_order` = ?');
      params.push(opts.banner_order);
    }

    if (opts.banner_redirected_url !== undefined) {
      fields.push('`banner_redirected_url` = ?');
      params.push(opts.banner_redirected_url);
    }

    if (fields.length === 0) {
      return responseHandler.returnErrorMessage(res, `No fields to update`);
    }

    params.push(opts.id);
    params.push(req.operator_id);
    params.push(opts.city_id);

    let query = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS} SET ${fields.join(', ')} WHERE id = ? AND operator_id = ? AND city_id = ?`;
    await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);
    return responseHandler.success(req, res, 'Banner updated successfully', '');
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.deleteBanner = async function (req, res) {
  try {
    let opts = req.body;

    if (!opts.id) {
      throw new Error('Banner ID is required');
    }

    if (!opts.city_id) {
      throw new Error('city_id is required');
    }
    let query = `DELETE FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.BANNERS} WHERE id = ? AND operator_id = ? AND city_id = ?`;
    let params = [opts.id, req.operator_id, opts.city_id];
    await db.RunQuery(dbConstants.DBS.LIVE_DB, query, params);
    return responseHandler.success(req, res, 'Banner deleted successfully', '');
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
