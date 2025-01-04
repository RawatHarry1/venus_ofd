const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  authConstants,
  generalConstants,
} = require('../../bootstart/header');
const moment = require('moment');
const axios = require('axios');

exports.pushFromRideServer = pushFromRideServer;

exports.sendPush = async function (driverObjArray, params) {
  try {
    let operatorDetailsQuery = `select name from ${dbConstants.DBS.LIVE_DB}.tb_operators where operator_id = ? `;
    let operatorDetails = db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      operatorDetailsQuery,
      [params.operator_id],
    );
    let message = params.message,
      smsType = rideConstants.COMMUNICATION_MEDIUM.PUSH,
      sentBy = params.sent_by,
      timeLimit = params.time_limit || 10,
      userArr = [];
    const requestBody = {
      data: [],
      push_admin_password: generalConstants.PASSWORDS.AUTOS_PUSH_PASSWORD,
    };
    let newArr = splitArrayIntoChunksOfLen(driverObjArray, 100);

    for (let z = 0; z < newArr.length; z++) {
      requestBody.data = [];
      let tempArr = newArr[z];
      let pushObj = [];
      for (var i = 0; i < tempArr.length; i++) {
        let tempUniqId = moment(new Date()).valueOf();
        let tempPushObj = [
          tempUniqId,
          tempArr[i].driver_id || tempArr[i].user_id,
          tempArr[i].phone_no,
          tempArr[i].city_id,
          message,
          params.sent_by,
          params.sms_type,
          params.sent_from,
          '',
          tempUniqId,
          'SUCCESS',
          '',
          0,
        ];
        pushObj.push(tempPushObj);
        requestBody.data.push({
          user_id: tempArr[i].driver_id || tempArr[i].user_id,
          flag: 117,
          title: 'VENUS',
          message: message,
          user_type: rideConstants.LOGIN_TYPE.DRIVER,
        });
      }
      await pushFromRideServer(
        requestBody,
        rideConstants.AUTOS_SERVERS_ENDPOINT.SEND_PUSH_DRIVER,
      );
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [],
    i = 0,
    n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }
  return chunks;
}

async function pushFromRideServer(requestBody, endpoint) {
  try {
    let resultWrapper = {};
    const url = rideConstants.SERVERS.AUTOS_SERVER + endpoint;

    let headers = {
      'Content-Type': 'application/json; charset=utf-8',
      operatortoken: requestBody.operator_token,
      accesstoken: requestBody.access_token,
    };

    if (endpoint == rideConstants.AUTOS_SERVERS_ENDPOINT.FIND_DRIVERS) {
      delete requestBody.access_token;
    }
    delete requestBody.operator_token;

    const response = await axios.post(url, requestBody, {
      headers: headers,
    });

    if (response.data && response.data.data) {
      resultWrapper = response.data.data;
    } else {
      resultWrapper = response.data;
    }
    return resultWrapper;
  } catch (error) {
    console.error('Error pushing to ride server:', error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}
