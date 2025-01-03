const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
    rideConstants,
    generalConstants,
  } = require('../../bootstart/header');


exports.validateUserUsingIdOrPhone = async function (fieldName, fieldValue, operatorId, loginType) {
    try {
        let userQuery;
        if (loginType == 0) {
            userQuery = `SELECT user_id, user_name, phone_no, user_email, user_name, current_location_latitude as lat, current_location_latitude as lng, access_token AS user_access_token FROM ${dbConstants.DBS.LIVE_DB}.tb_users WHERE ${fieldName} = ? AND operator_id = ?`;
        }
        else if (loginType == 1) {
            userQuery = `SELECT customer_id FROM  ${dbConstants.DBS.LIVE_DB}.tb_customers WHERE customer_id = ? AND operator_id = ?`;
        }

        var data = await db.RunQuery(dbConstants.DBS.LIVE_DB, userQuery, [fieldValue, operatorId] );

        if (!data.length) {
            throw new Error('Invalid user.');
        }

        return data[0];

    } catch (error) {
        throw new Error(error.message);
    }
}

exports.checkUserCorporate = async function (corporateId, userId) {
    try {
        let userQuery = `SELECT user_id FROM ${dbConstants.DBS.LIVE_DB}.tb_corporate_users WHERE business_id = ? AND user_id = ?`;

        var data = await db.RunQuery(dbConstants.DBS.LIVE_DB, userQuery, [corporateId, userId]);

        return data[0];

    } catch (error) {
        throw new Error(error.message);
    }
}

