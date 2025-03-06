const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  generalConstants,
} = require('../../../bootstart/header');
const Helper = require('../helper');
const { getOperatorParameters } = require('../../admin/helper');
const { pushFromRideServer } = require('../../push_notification/helper');
const moment = require('moment');

exports.findAvailableDrivers = async function (req, res) {
  try {
    req.body.operator_token = req.headers.operatortoken;
    req.body.access_token = req.headers.accesstoken;

    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.FIND_DRIVERS;

    let drivers = await pushFromRideServer(req.body, endpoint);

    return responseHandler.success(req, res, '', drivers);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.requestRideThroughBusinessUser = async function (req, res) {
  try {
    req.body.operator_token = req.operator_token;
    req.body.manual_ride_request = req.business_id || req.body.business_id;
    req.body.super_admin_password =
      generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD;
    req.body.phone_no = req.body.user_phone;

    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.REQUEST_RIDE;

    let responseWrapper = await pushFromRideServer(req.body, endpoint);

    return responseHandler.success(req, res, '', responseWrapper);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fareEstimateThroughBusinessUser = async function (req, res) {
  try {
    req.body.operator_token = req.operator_token;

    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.FARE_ESTIMATE;

    let fareWrapper = await pushFromRideServer(req.body, endpoint);

    return responseHandler.success(req, res, '', fareWrapper);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.cancelRideFromPanelV2 = async function (req, res) {
  try {
    let userId = req.body.customer_id;
    let engagementId = req.body.engagement_id;
    let driverId = req.body.driver_id;
    let rideTime = req.body.ride_time;
    let distanceTravelled = req.body.distance_travelled;
    let latitude = req.body.latitude;
    let longitude = req.body.longitude;
    let operatorId = req.operator_id;
    let tollCharge = req.body.toll_charge;
    let tipAmount = req.body.tip_amount;

    let mandatoryParams = [
      userId,
      driverId,
      engagementId,
      latitude,
      longitude,
      distanceTravelled,
      rideTime,
      operatorId,
    ];
    if (Helper.checkBlank(mandatoryParams)) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    let checkEngagementOperatorQuery = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES} WHERE user_id = ? AND driver_id = ? AND engagement_id = ? AND operator_id_x = ? `;

    let checkEngagementDetails = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      checkEngagementOperatorQuery,
      [userId, driverId, engagementId, operatorId],
    );

    if (!checkEngagementDetails || !checkEngagementDetails.length) {
      throw new Error('No associated operator found with this ride.');
    }

    var stmt = `SELECT access_token FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} where driver_id = ? AND operator_id = ? `;

    let result = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, [
      driverId,
      operatorId,
    ]);

    if (!result.length) {
      return responseHandler.returnErrorMessage(res, `No such driver found.'`);
    }

    var driverAccessToken = result[0].access_token;

    var reqBody = {
      access_token: driverAccessToken,
      customerId: userId,
      engagementId: engagementId,
      latitude: latitude,
      longitude: longitude,
      ride_time: rideTime,
      ride_time_in_seconds: Number(req.body.ride_time) * 60,
      distance_travelled: distanceTravelled,
      payment_mode: 1,
      is_cached: 2,
      paid_using_wallet: 0,
      business_id: 1,
      wait_time: 0,
      reference_id: 0,
      by_operator: 1,
      user_reallocation: 0,
    };

    let endpoint = rideConstants.AUTOS_SERVERS_ENDPOINT.CANCEL_RIDE;
    let autosResponse = await pushFromRideServer(reqBody, endpoint);

    return responseHandler.success(req, res, '', autosResponse);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.scheduleRideThroughBusinessUser = async function (req, res) {
  try {
    var accessToken = req.headers.accesstoken || req.body.access_token;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    var pickupTime = req.body.pickup_time;
    var regionId = req.body.region_id;
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
    var recipientPhoneNo = req.body.recipient_phone_no || '';
    var packageDetails = req.body.package_details || '';
    var estimatedFare = req.body.estimated_fare || '0.0';
    var estimatedTripDistance = req.body.estimated_trip_distance || '0';
    var paystackReferenceId = req.body.paystack_reference_id || '';

    var userReqKeys = ['user_id', 'operator_id'];
    var userCriteria = [{ key: 'access_token', value: accessToken }];

    let user = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}`,
      userReqKeys,
      userCriteria,
    );
    user = user[0];

    var userId = user.user_id;
    var cityWrapper = {};
    await Helper.fetchNearestCity(
      latitude,
      longitude,
      user.operator_id,
      cityWrapper,
    );
    if (!cityWrapper.city) {
      return responseHandler.returnErrorMessage(
        res,
        'service_not_avail_in_area',
      );
    }

    var paramsWrapper = {},
      subRegionWrapper = {};

    var paramsReqKeys = ['schedule_current_time_diff'];
    paramsReqKeys = paramsReqKeys.join(',');
    await getOperatorParameters(paramsReqKeys, user.operator_id, paramsWrapper);
    var currentTimeDiff = paramsWrapper.schedule_current_time_diff;

    var paramsReqKeys = ['schedule_days_limit'];
    paramsReqKeys = paramsReqKeys.join(',');
    await getOperatorParameters(paramsReqKeys, user.operator_id, paramsWrapper);
    var daysLimit = paramsWrapper.schedule_days_limit;

    var subRegionReqKeys = ['region_id'];
    var subRegionCriteria = [
      { key: 'region_id', value: regionId },
      { key: 'operator_id', value: user.operator_id },
    ];

    subRegionWrapper = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
      subRegionReqKeys,
      subRegionCriteria,
    );

    if (!subRegionWrapper.length) {
      throw new Error('Invalid region id passed');
    }

    // var currentTimeDiff = paramsWrapper.schedule_current_time_diff;
    // var daysLimit = paramsWrapper.schedule_days_limit;

    if (
      Helper.isAValidScheduleTime(pickupTime, currentTimeDiff, daysLimit) ===
      false
    ) {
      return responseHandler.returnErrorMessage(
        res,
        `A pickup can only be scheduled after ${currentTimeDiff} minutes from now till midnight the next day.`,
      );
    }

    var existing = await Helper.hasAlreadyScheduled(userId);

    if (existing) {
      return responseHandler.returnErrorMessage(
        res,
        `You can only schedule one ride at a time.`,
      );
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
      package_details: packageDetails,
      estimated_fare: estimatedFare,
      estimated_trip_distance: estimatedTripDistance,
      coupon_to_apply: couponToApply,
      promo_to_apply: promoToApply,
    };
    if (packageDetails) {
      scheduleRide.package_details = JSON.stringify(packageDetails);
    }
    if (paystackReferenceId) {
      scheduleRide.paystack_reference_id = paystackReferenceId;
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
};

exports.assignDriverToScheduleRide = async function (req, res) {
  try {
    var pickupId = req.body.pickup_id;
    var driverId = req.body.driver_id;

    if (!driverId || !pickupId) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var pickUpCriteria = [{ key: 'pickup_id', value: pickupId }];

    // var vehicleValues = {};
    let pickupData = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE}`,
      ['*'],
      pickUpCriteria,
    );

    if (!pickupData) {
      return responseHandler.returnErrorMessage(
        res,
        `No pickups to assign right now`,
      );
    }
    var driverCriteria = [{ key: 'driver_id', value: driverId }];
    let driverWrapper = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS}`,
      ['*'],
      driverCriteria,
    );
    if (!driverWrapper) {
      throw new Error("The user couldn't be verified.");
    }

    var driverData = driverWrapper[0];
    pickupData = pickupData[0];
    var pickupStatus = pickupData.status;
    var incomingSchedulePickupTime = new Date(pickupData.pickup_time); 

    /* 
    Fetch Driver's other schedule ride if any
    */
    let scheduleWrapper = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE}`,
      ['*'],
      [{ key: 'driver_to_engage', value: driverId },{ key: 'status', value: rideConstants.SCHEDULE_STATUS.IN_QUEUE }],
    );
    if (scheduleWrapper.length) {
      for (let schedule of scheduleWrapper) {
        let oldSchedulePickupTime = new Date(schedule.pickup_time);

        // If the scheduled ride pickup times are exactly the same
        if (incomingSchedulePickupTime.getTime() === oldSchedulePickupTime.getTime()) {
          return responseHandler.returnErrorMessage(
            res,
            'Driver is already assigned to another scheduled ride at the same time.'
          );
        }
        let timeDifference = Math.abs(incomingSchedulePickupTime - oldSchedulePickupTime);

        if (timeDifference < 24 * 60 * 60 * 1000) {
          return responseHandler.returnErrorMessage(
            res,
            'Driver can only have multiple schedules if there is at least a 24-hour gap between them.'
          );
        }
      }
    }

    if (driverData.status == rideConstants.USER_STATUS.BUSY) {
      return responseHandler.returnErrorMessage(
        res,
        'Driver is busy on another ride',
      );
    }

    if (pickupStatus == rideConstants.SCHEDULE_STATUS.IN_PROCESS) {
      return responseHandler.returnErrorMessage(
        res,
        'Sorry! This Schedule is already in progress',
      );
    }

    if (pickupStatus == rideConstants.SCHEDULE_STATUS.CANCELLED) {
      return responseHandler.returnErrorMessage(
        res,
        'Sorry! This Schedule is cancelled',
      );
    }

    if (pickupStatus == rideConstants.SCHEDULE_STATUS.PROCESSED) {
      return responseHandler.returnErrorMessage(
        res,
        'Sorry! This Schedule is already completed',
      );
    }

    if (pickupData.session_id != -1) {
      let sessionWrapper = await db.SelectFromTable(
        dbConstants.DBS.LIVE_DB,
        `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.IN_THE_AIR}`,
        ['is_active'],
        [{ key: 'session_id', value: pickupData.session_id }],
      );

      sessionWrapper = sessionWrapper[0];
      if (sessionWrapper.is_active == rideConstants.SESSION_STATUS.ACTIVE) {
        return responseHandler.returnErrorMessage(
          res,
          'Sorry! The ride is already in progress',
        );
      }
    }

    if (pickupStatus == rideConstants.SCHEDULE_STATUS.IN_QUEUE) {
      updateKeys = { driver_to_engage: driverId };
      updateCriteria = [{ key: 'pickup_id', value: pickupId }];
      await db.updateTable(
        dbConstants.DBS.LIVE_DB,
        `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE}`,
        updateKeys,
        updateCriteria,
      );
    }

    return responseHandler.success(req, res, '', '');
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.removePickupSchedule = async function (req, res) {
  try {
    var operatorId = req.operator_id;
    var pickupId = req.body.pickup_id;
    // var accessToken = req.headers.accesstoken;

    var checkValues = Helper.checkBlank([pickupId, operatorId]);

    if (checkValues === 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var query = `SELECT cr.operator_id FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} cr JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE} ts
    ON ts.region_id = cr.region_id
    WHERE ts.pickup_id = ? `;

    let operatorDetails = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, [
      pickupId,
    ]);

    if (!operatorDetails || !operatorDetails.length) {
      throw new Error('No associated operator found.');
    }

    if (operatorDetails[0].operator_id != operatorId) {
      throw new Error('Invalid operator.');
    }

    var pickupReqKeys = ['status', 'pickup_time'];
    var pickupCriteria = [{ key: 'pickup_id', value: pickupId }];
    var pickup = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE}`,
      pickupReqKeys,
      pickupCriteria,
    );
    if (!pickup.length) {
      return responseHandler.returnErrorMessage(res, 'No pickup found');
    }
    pickup = pickup[0];

    var paramsWrapper = {};

    await getOperatorParameters(
      'schedule_cancel_window',
      operatorId,
      paramsWrapper,
    );

    let cancelWindowTime = paramsWrapper.schedule_cancel_window || 0;

    if (!canBeRemovedNow(pickup.pickup_time, cancelWindowTime)) {
      return responseHandler.returnErrorMessage(
        res,
        'Sorry, pickup cannot be cancelled at this moment',
      );
    }

    updateKeys = { status: rideConstants.SCHEDULE_STATUS.CANCELLED };
    updateCriteria = [{ key: 'pickup_id', value: pickupId }];
    await db.updateTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SCHEDULE_RIDE}`,
      updateKeys,
      updateCriteria,
    );

    return responseHandler.success(
      req,
      res,
      'Scheduled cancelled successfully',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

function canBeRemovedNow(pickupTime, cancelTime) {
  if (moment(pickupTime).diff(moment(), 'minutes') < cancelTime) {
    return false;
  }
  return true;
}

exports.reAssignDriver = async function (req, res) {
  try {
    var accessToken = req.body.access_token;
    var engagementId = req.body.trip_id;
    var driverId = req.body.driver_id;
    var userId = req.body.user_id || '';
    var isFromWeb = req.body.is_from_web || 0;
    var requestRideType = req.request_ride_type || 1;
    var operatorId = req.operator_id;
    let response;

    if (!driverId || !engagementId) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var queryParameters = isFromWeb
      ? [{ key: 'user_id', value: userId }]
      : [{ key: 'access_token', value: accessToken }];

    var getExistingUser = `SELECT 
  user_id, 
  is_blocked, 
  user_name, 
  first_name, 
  last_name, 
  address, 
  phone_no, 
  country_code, 
  user_email, 
  email_verification_status, 
  date_registered, 
  access_token, 
  referral_code, 
  city, 
  can_request, 
  can_schedule, 
  assign_station, 
  unique_device_id, 
  user_category, 
  reg_as, 
  operator_id, 
  total_rating_user / total_rating_got_user AS rating, 
  current_location_latitude, 
  current_location_longitude, 
  current_user_status, 
  reg_as, 
  vehicle_type, 
  assign_station, 
  app_versioncode, 
  device_type, 
  device_name, 
  total_rides_as_user, 
  status, 
  is_available, 
  autos_available, 
  driver_car_no, 
  referred_by, 
  user_image, 
  verification_status, 
  is_guest_account, 
  paytm_usage_count, 
  gender, 
  date_of_birth, 
  req_stat AS customer_verification_status, 
  locale, 
  current_country 
FROM 
  ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} 
WHERE
 `;

    var values = [];

    for (var i = 0; i < queryParameters.length; i++) {
      getExistingUser += `` + queryParameters[i].key + ` = ?`;
      if (i !== queryParameters.length - 1) {
        getExistingUser += ` AND `;
      }
      values.push(queryParameters[i].value);
    }

    var userWrapper = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      getExistingUser,
      values,
    );

    if (!userWrapper.length) {
      throw new Error('user not exist');
    }
    userWrapper = userWrapper[0];

    var driverCriteria = [{ key: 'driver_id', value: driverId }];

    var driverWrapper = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS}`,
      ['*'],
      driverCriteria,
    );

    if (!driverWrapper.length) {
      throw new Error('Driver not exist');
    }

    driverWrapper = driverWrapper[0];

    var engagementWrapper = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES}`,
      ['*', 'tb_engagements.current_time AS created_at'],
      [{ key: 'engagement_id', value: engagementId }],
    );

    if (!engagementWrapper.length) {
      return responseHandler.returnErrorMessage(res, `Ride not exist`);
    }

    engagementWrapper = engagementWrapper[0];

    if (engagementWrapper.status == rideConstants.ENGAGEMENT_STATUS.STARTED) {
      return responseHandler.returnErrorMessage(res, `Ride already started.`);
    }

    if (engagementWrapper.status == rideConstants.ENGAGEMENT_STATUS.ACCEPTED) {
      return responseHandler.returnErrorMessage(
        res,
        `Ride already accepted by other driver`,
      );
    }

    await db.updateTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES}`,
      { status: 0, driver_id: driverId },
      [{ key: 'engagement_id', value: engagementId }],
    );

    await db.updateTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.IN_THE_AIR}`,
      { is_active: 1, ride_acceptance_flag: 0 },
      [{ key: 'session_id', value: engagementWrapper.session_id }],
    );

    if (requestRideType == rideConstants.CLIENTS.MARS) {
      await db.updateTable(
        dbConstants.DBS.LIVE_DB,
        `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.PACKAGE_SESSION}`,
        {
          delivery_status: rideConstants.DELIVERY_PACKAGE_STATUS.REQUESTED,
          package_image_while_pickup: null,
        },
        [{ key: 'engagement_id', value: engagementId }],
      );
    }

    var updatedEngagementWrapper = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES}`,
      ['*', 'tb_engagements.current_time AS created_at'],
      [{ key: 'engagement_id', value: engagementId }],
    );

    updatedEngagementWrapper = updatedEngagementWrapper[0];

    if (
      updatedEngagementWrapper.status ==
      rideConstants.ENGAGEMENT_STATUS.REQUESTED
    ) {
      if (driverWrapper.status == rideConstants.USER_STATUS.BUSY) {
        return responseHandler.returnErrorMessage(
          res,
          `Driver is busy on another ride`,
        );
      }

      var requestBody = {
        access_token: driverWrapper.access_token,
        latitude: driverWrapper.current_latitude,
        longitude: driverWrapper.current_longitude,
        is_delivery: 0,
        tripId: engagementId.toString(),
        customerId: userWrapper.user_id,
        operator_token: req.operator_token,
      };
      console.log('requestBody', requestBody);

      response = await pushFromRideServer(
        requestBody,
        '/driver/acceptTripRequest',
      );
    }

    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
