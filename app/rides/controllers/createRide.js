const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
    rideConstants,
    generalConstants
  } = require('../../../bootstart/header');
  const Helper = require('../helper');
  var Joi = require('joi');
  var QueryBuilder = require('datatable');
const settingsHelper = require('../../settings/helper');
const { getOperatorParameters } = require('../../admin/helper');


exports.scheduleRideThroughBusinessUser = async function (req, res) {
    try {
        var accessToken = req.headers.accesstoken || req.body.access_token;
        var latitude    = req.body.latitude;
        var longitude   = req.body.longitude;
        var pickupTime  = req.body.pickup_time;
        var regionId    = req.body.region_id;
        var opDropLatitude = req.body.op_drop_latitude;
        var opDropLongitude = req.body.op_drop_longitude;
        var preferredPaymentMode = req.body.preferred_payment_mode || 0;
        var couponToApply = req.body.coupon_to_apply || 0;
        var promoToApply = req.body.promo_to_apply || 0;
        var pickupLocationAddress = req.body.pickup_location_address;
        var dropLocationAddress = req.body.drop_location_address;
        var isRequestFromPanel = req.body.business_token;
        var packageId = req.body.package_id || 0;
        var driverId = req.body.driver_to_engage || 0;
        var customerNote = req.body.customer_note || '';
        var poolFareId = req.body.pool_fare_id || 0;
        var requestRideType = req.body.request_ride_type;
        var recipientName = req.body.recipient_name || '';
        var recipientPhoneNo = req.body.recipient_phone_no || ''
        var packageDetails   = req.body.package_details || ''
        var estimatedFare   = req.body.fare || "0.0"
        var estimatedTripDistance = req.body.ride_distance || "0"
        var paystackReferenceId  = req.body.paystack_reference_id || ''

        var userReqKeys = ['user_id', 'operator_id'];
        var userCriteria = [{key: 'access_token', value: accessToken}];

        let user = await db.SelectFromTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}`,
            userReqKeys,
            userCriteria
        );
        user = user[0]

        var userId = user.user_id;
        var cityWrapper = {};
        await Helper.fetchNearestCity(latitude, longitude, user.operator_id, cityWrapper)
        if(!cityWrapper.city) {
            throw new Error("service_not_avail_in_area")
        };

        var paramsWrapper = {}, subRegionWrapper = {};

        var paramsReqKeys = ['schedule_current_time_diff']
        paramsReqKeys = paramsReqKeys.join(',');
        await getOperatorParameters(paramsReqKeys, user.operator_id, paramsWrapper)
        var currentTimeDiff = paramsWrapper.schedule_current_time_diff;

        var paramsReqKeys = ['schedule_days_limit']
        paramsReqKeys = paramsReqKeys.join(',');
        await getOperatorParameters(paramsReqKeys, user.operator_id, paramsWrapper)
        var daysLimit = paramsWrapper.schedule_days_limit;

        var subRegionReqKeys = ['region_id'];
        var subRegionCriteria = [{ key: 'region_id', value: regionId }, { key: 'operator_id', value: user.operator_id }];

        subRegionWrapper = await db.SelectFromTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
            subRegionReqKeys,
            subRegionCriteria
        );

        if (!subRegionWrapper.length) {
            throw new Error("Invalid region id passed");
        }

        // var currentTimeDiff = paramsWrapper.schedule_current_time_diff;
        // var daysLimit = paramsWrapper.schedule_days_limit;

        if (Helper.isAValidScheduleTime(pickupTime, currentTimeDiff, daysLimit) === false) {
            throw new Error(`A pickup can only be scheduled after ${currentTimeDiff} minutes from now till midnight the next day.`);
        }; 

        var existing = await Helper.hasAlreadyScheduled(userId);

        if (existing) {
            throw new Error(`You can only schedule one ride at a time.`);
        }

        var scheduleRide = {
            user_id: userId,
            latitude: latitude,
            longitude: longitude,
            op_drop_latitude: opDropLatitude,
            op_drop_longitude: opDropLongitude,
            pickup_location_address: pickupLocationAddress,
            drop_location_address: dropLocationAddress,
            pickup_time: pickupTime,
            region_id: regionId,
            preferred_payment_mode: preferredPaymentMode,
            package_id: packageId,
            driver_to_engage: driverId,
            customer_note: customerNote,
            operator_id: user.operator_id,
			pool_fare_id: poolFareId,
            service_type: requestRideType,
            recipient_name: recipientName,
            recipient_phone_number: recipientPhoneNo,
            package_details : packageDetails,
            estimated_fare : estimatedFare,
            estimated_trip_distance: estimatedTripDistance,
            coupon_to_apply: couponToApply,
            promo_to_apply: promoToApply
        };
        if(packageDetails){
            scheduleRide.package_details = JSON.stringify(packageDetails)
        }
        if(paystackReferenceId){
            scheduleRide.paystack_reference_id = paystackReferenceId
        }

        await db.InsertIntoTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE}`,
            scheduleRide,
          );

        //   if(isRequestFromPanel){
        //     var localPickupTime = moment(pickupTime).add(cityWrapper.city.utc_offset, 'minutes').format("YYYY-MM-DD HH:mm:ss");
        //     var message = req.t('customer.manual_dispatch.success', {
        //         pickup_location_address: pickupLocationAddress,
        //         local_pickup_time: localPickupTime,
        //     });
        //     var flag = 1;
        //     var payload = {
        //         flag: constants.notificationFlags.DISPLAY_MESSAGE,
        //         message: message,
        //         user_type: constants.userRegistrationStatus.CUSTOMER
        //     };
        //     utils.sendNotification(userId, message, flag, payload);
        // }
        return responseHandler.success(req, res, 'Schedule Created', '');
    } catch (error) {
        errorHandler.errorHandler(error, req, res);
    }

}