const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  documentsConstants,
} = require('../../../bootstart/header');
const { checkBlank } = require('../../rides/helper');

exports.updatedOperatorCityReferral = async function (req, res) {
  try {
    const {
      user_referral_bonus,
      user_referral_bonus_type,
      user_referee_bonus,
      user_referee_bonus_type,
      city_id,
    } = req.body;

    const updateFields = {
      ...(user_referral_bonus !== undefined && { user_referral_bonus }),
      ...(user_referral_bonus_type !== undefined && {
        user_referral_bonus_type,
      }),
      ...(user_referee_bonus !== undefined && { user_referee_bonus }),
      ...(user_referee_bonus_type !== undefined && { user_referee_bonus_type }),
      ...(city_id !== undefined && { city_id }), // Include city_id even if it's 0
    };

    if (Object.keys(updateFields).length === 0) {
      return responseHandler.success(req, res, 'No updates provided.', {});
    }

    const updateCriteria = [
      { key: 'city_id', value: city_id },
      { key: 'operator_id', value: req.operator_id },
    ];

    await db.updateTable(
      dbConstants.DBS.AUTH_DB,
      `${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.AUTH_OPERATORS}`,
      updateFields,
      updateCriteria,
    );

    return responseHandler.success(
      req,
      res,
      'Referral updated successfully.',
      {},
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.getOperatorCityReferral = async function (req, res) {
  try {
    let operatorId = req.operator_id;
    let cityId = req.query.city_id;

    let response = {};
    if (checkBlank([cityId, operatorId])) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    let referralQuery = `SELECT user_referral_bonus, user_referral_bonus_type, user_referee_bonus, user_referee_bonus_type,
    driver_referral_bonus, driver_referral_bonus_type, driver_referee_bonus, driver_referee_bonus_type,
    referral_data FROM ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.O_CITY} WHERE operator_id = ? AND city_id = ?`;

    const referralData = await db.RunQuery(
      dbConstants.DBS.AUTH_DB,
      referralQuery,
      [operatorId, cityId],
    );

    for (var i in referralData) {
      if (
        referralData[i].user_referral_bonus_type ==
          rideConstants.REFFERAL_BONUS_TYPE.CREDIT &&
        referralData[i].user_referral_bonus == 0
      ) {
        referralData[i].user_referral_bonus_type =
          rideConstants.REFFERAL_BONUS_TYPE.NONE;
      }
      if (
        referralData[i].user_referee_bonus_type ==
          rideConstants.REFFERAL_BONUS_TYPE.CREDIT &&
        referralData[i].user_referee_bonus == 0
      ) {
        referralData[i].user_referee_bonus_type =
          rideConstants.REFFERAL_BONUS_TYPE.NONE;
      }
    }

    return responseHandler.success(req, res, '', referralData);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
