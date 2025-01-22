const { errorHandler,responseHandler,rideConstants,generalConstants } = require('../../../bootstart/header');
const Helper = require('../helper');

exports.createFranchiseeFromPanel = async function (req, res) {
  try {
    req.body.operator_id = req.operator_id;
    req.body.city_id     = req.city;
    req.body.user_id  = req.user_id;
    req.body.password = generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD;
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.CREATE_FRANCHISEE_FROM_PANEL;

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

exports.updateFranchisee = async function (req, res) {
  try {
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.UPDATE_FRANCHISEE;

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

exports.deleteFranchisee = async function (req, res) {
  try {
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.DELETE_FRANCHISEE;

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

exports.fetchAllFranchisees = async function (req, res) {
  try {
    var page = req.query.page
    var limit = req.query.limit
    var sortField = req.query.sortField
    let sortOrder = req.query.sortOrder
    let search = req.query.search

    delete req.query.token;
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.LIST_FRANCHISEES;
    const queryParams = [];
    if (page) {
      queryParams.push(`page=${page}`);
    }
    if (limit) {
      queryParams.push(`limit=${limit}`);
    }
    if (sortField) {
      queryParams.push(`sortField=${sortField}`);
    }
    if (sortOrder) {
      queryParams.push(`sortOrder=${sortOrder}`);
    }
    if (search) {
      queryParams.push(`search=${search}`);
    }
    if (queryParams.length > 0) {
      endpoint += '?' + queryParams.join('&');
    }

    let response = await Helper.sendGetRequestToMerchantServer(
      req.query,
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

exports.signupFranchisee = async function (req, res) {
  try {
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.SIGNUP_FRANCHISEE;
    if (req.body.currentStep == 1) {
      req.body.operator_id = req.operator_id;
      req.body.city_id = req.city;
    }
    req.body.token = req.headers.jwttoken

    let response = await Helper.sendPostRequestToMerchantServer(
      req.body,
      endpoint
    );

    if (response.flag && (response.flag == 100 || response.flag == 102)) {

      return responseHandler.returnErrorMessage(
        res,
        response.error.error || response.message,
      );
    }

    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.loginFranchisee = async function (req, res) {
  try {
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.LOGIN_FRANCHISEE;

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


exports.changePassword = async function (req, res) {
  try {
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.CHANGE_PASSWORD;
    req.body.token = req.headers.jwttoken

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

exports.resetPassword = async function (req, res) {
  try {
    let endpoint = rideConstants.MERCHANT_SERVER_ENDPOINT.RESET_PASSWORD;

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
