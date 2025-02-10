const { rideConstants } = require('../../bootstart/header');
const axios = require('axios');

exports.sendPostRequestToMerchantServer = sendPostRequestToMerchantServer;
exports.sendGetRequestToMerchantServer = sendGetRequestToMerchantServer;

async function sendPostRequestToMerchantServer(requestBody, endpoint, req) {
  try {
    const chalk = await import('chalk');
    let resultWrapper = {};
    const url = rideConstants.SERVERS.MERCHANT_SERVER + endpoint;

    let headers = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await axios.post(url, requestBody, {
      headers: headers,
    });

    console.log(
      chalk.default.green('Response from merchant server: ') +
        chalk.default.cyan(JSON.stringify(response.data)),
    );

    if (endpoint == rideConstants.MERCHANT_SERVER_ENDPOINT.SIGNUP_FRANCHISEE) {
      if (response.message) {
        resultWrapper = response.message;
      }
    } else {
      if (response.data && response.data.data) {
        resultWrapper = response.data.data;
      } else {
        resultWrapper = response.data;
      }
    }
    return resultWrapper;
  } catch (error) {
    if (error.status == 400) {
      return error.response?.data;
    }
    throw new Error(error.response?.data?.message || error.message);
  }
}

async function sendGetRequestToMerchantServer(queryParams, endpoint) {
  try {
    const chalk = await import('chalk');
    const url = rideConstants.SERVERS.MERCHANT_SERVER + endpoint;

    let headers = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await axios.get(url, {
      headers: headers,
      params: queryParams, // Attach query parameters to the GET request
    });

    console.log(
      chalk.default.green('Response from merchant server: ') +
        chalk.default.cyan(JSON.stringify(response.data)),
    );

    let resultWrapper = {};
    if (response.data && response.data.data) {
      resultWrapper = response.data.data;
    } else {
      resultWrapper = response.data;
    }
    return resultWrapper;
  } catch (error) {
    console.error('Error fetching from merchant server:', error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}
