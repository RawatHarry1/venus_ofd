const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
  } = require('../../bootstart/header');
  



exports.sendPush = async function (dataToSend, params) {
	try {
		let operatorDetailsQuery = `select name from ${dbConstants.DBS.LIVE_DB}.tb_operators where operator_id = ? `
		let operatorDetails = db.RunQuery(dbConstants.DBS.LIVE_DB, operatorDetailsQuery, [params.operator_id])
		let message = params.message,
			smsType = constants.communicationMedium.PUSH,
			sentBy = params.sent_by,
			timeLimit = params.time_limit || 10,
			userArr = [];
		const requestBody = {
			data: [],
			push_admin_password: config.get('autosPushPassword'),
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
					user_type: constants.loginType.DRIVER,
				});
			}
			await pushFromRideServer(requestBody);
			await Promise.delay(200);
		}


	} catch (error) {
		throw new Error(error.message);

	}
}