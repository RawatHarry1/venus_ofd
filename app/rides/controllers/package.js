const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
} = require('../../../bootstart/header');
const Helper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');
const settingsHelper = require('../../settings/helper');

exports.fetchPackageTypes = async function (req, res) {
  try {
    let package_types = [];
    let query = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.tb_package_types`;
    let result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, []);

    if (result.length > 0) {
      package_types = result.map((item) => item.type);
    }

    return responseHandler.success(req, res, '', package_types);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchPackages = async function (req, res) {
  try {
    let query = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.tb_delivery_packages`;
    let result = await runQuery(handlerInfo, { query, params: [] });
    return responseHandler.success(req, res, '', result);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.uploadFileController = async function (req, res) {
  try {
    if (!req.file) {
      throw new Error('No file provided');
    }
    const timestamp = Date.now();

    var docImage = req.file;
    var wrapperObject = {};
    var awsCredentials = {
      ridesDataBucket:
        process.env.AWS_RIDES_DATA_BUCKET + '/temp-package' + timestamp,
      driverDocumentsBucket: process.env.AWS_DRIVER_DOCUMENTS_BUCKET,
      operatorDataBucket: process.env.AWS_OPERATOR_DATA_BUCKET,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      region: process.env.AWS_REGION,
    };
    try {
      var filename = Date.now() + '.' + docImage.originalname.split('.').pop();
    } catch (e) {
      var filename = Date.now();
    }

    await settingsHelper.readImageFile(docImage, wrapperObject);

    await settingsHelper.uploadFileToS3(
      awsCredentials,
      filename,
      wrapperObject,
    );

    return responseHandler.success(
      req,
      res,
      'Uploaded Successfully',
      wrapperObject.url,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
