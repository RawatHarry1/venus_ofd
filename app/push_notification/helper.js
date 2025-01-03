const request = require('request');
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
  const moment = require('moment')
  



exports.sendPush = async function (driverObjArray, params) {
	try {
		let operatorDetailsQuery = `select name from ${dbConstants.DBS.LIVE_DB}.tb_operators where operator_id = ? `
		let operatorDetails = db.RunQuery(dbConstants.DBS.LIVE_DB, operatorDetailsQuery, [params.operator_id])
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
				let tempPushObj = [tempUniqId, tempArr[i].driver_id || tempArr[i].user_id, tempArr[i].phone_no, tempArr[i].city_id, message, params.sent_by, params.sms_type, params.sent_from, "", tempUniqId, "SUCCESS", "", 0]
				pushObj.push(tempPushObj);
				requestBody.data.push({
					user_id: tempArr[i].driver_id || tempArr[i].user_id,
					flag: 117,
					title: "VENUS",
					message: message,
					user_type: rideConstants.LOGIN_TYPE.DRIVER,
				});
			}
			await pushFromRideServer(requestBody, '/send_push_from_autos');
		}
	} catch (error) {
		throw new Error(error.message);

	}
}

function splitArrayIntoChunksOfLen(arr, len) {
	var chunks = [], i = 0, n = arr.length;
	while (i < n) {
	  chunks.push(arr.slice(i, i += len));
	}
	return chunks;
}


async function pushFromRideServer (requestBody,endpoint){
	  try {
		var push_options = {
		  url: rideConstants.SERVERS.AUTOS_SERVER + endpoint,
		  method: "POST",
		  body: requestBody,
		  json: true,
		  rejectUnauthorized: false,
		  headers: {
			'Content-Type': 'application/json; charset=utf-8'
		  }
		};
		request(push_options, function (error, response, body) {
		  if (error || response.statusCode != '200') {
			loggingImp.error({EVENT: "error from rides server for push", error, response});
		  }

		});
	  } catch (error) {
		loggingImp.error({EVENT: "error from pushFromRideServer", error, response});
		resolve();
	  }
}
