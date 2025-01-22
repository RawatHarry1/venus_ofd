const { errorHandler,responseHandler,rideConstants,generalConstants } = require('../../../bootstart/header');
const Helper = require('../helper');


exports.fetchAllSubscriptions = async function (req, res) {
  try {
    delete req.query.token;
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.FETCH_ALL_SUBSCRIPTIONS;

    let response = await Helper.sendGetRequestToMerchantServer(
      req.query,
      endpoint
    );

    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.createSubscription = async function (req, res) {
  try {
    req.body.operator_token = req.operator_token;
    req.body.operator_id = req.operator_id;
    req.body.city_id     = req.city;
    req.body.admin_id    = req.user_id;
    req.body.admin_user_name = req.name_from_acl
    req.body.user_id  = req.user_id;
    req.body.password = generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD;
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.CREATE_SUBSCRIPTION;

    let response = await Helper.sendPostRequestToMerchantServer(
      req.body,
      endpoint
    );

    if (response.flag && (response.flag == 100 || response.flag == 102)) {
      return responseHandler.returnErrorMessage(
        res,
        response.error || response.message,
      );
    }

    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateSubscription = async function (req, res) {
  try {
    req.body.operator_token = req.operator_token;
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.UPDATE_SUBSCRIPTION;

    let response = await Helper.sendPostRequestToMerchantServer(
      req.body,
      endpoint
    );

    if (response.flag && (response.flag == 100 || response.flag == 102)) {

      return responseHandler.returnErrorMessage(
        res,
        response.error || response.message,
      );
    }

    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.deleteSubscription = async function (req, res) {
  try {
    req.body.operator_token = req.operator_token;
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.DELETE_SUBSCRIPTION;

    let response = await Helper.sendPostRequestToMerchantServer(
      req.body,
      endpoint
    );

    if (response.flag && (response.flag == 100 || response.flag == 102)) {

      return responseHandler.returnErrorMessage(
        res,
        response.error || response.message,
      );
    }

    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
