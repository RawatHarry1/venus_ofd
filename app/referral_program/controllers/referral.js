


const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const documentsConstant = require('../../../constants/document');
const rideHelper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');

exports.updatedOperatorCityReferral = async function (req, res) {
    try {
        const { 
            user_referral_bonus, 
            user_referral_bonus_type, 
            user_referee_bonus, 
            user_referee_bonus_type, 
            city_id 
        } = req.body;

        const updateFields = {
            ...(user_referral_bonus && { user_referral_bonus }),
            ...(user_referral_bonus_type && { user_referral_bonus_type }),
            ...(user_referee_bonus && { user_referee_bonus }),
            ...(user_referee_bonus_type && { user_referee_bonus_type }),
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
            updateCriteria
        );

        return responseHandler.success(req, res, 'Referral updated successfully.', {});
    } catch (error) {
        errorHandler.errorHandler(error, req, res);
    }
};

