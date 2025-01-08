const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  PromoConstant,
  authConstants,
  generalConstants,
} = require('../../../bootstart/header');

const GeneralConstant = require('../../../constants/general');
const Helper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');
var moment = require('moment');
const { checkBlank } = require('../../rides/helper');
const { getOperatorParameters } = require('../../admin/helper');

exports.insertPomotions = async function (req, res) {
  try {
    var response = {};
    var benefitType = req.body.benefit_type;
    var promoType = req.body.promo_type;
    var endDate = req.body.end_date;
    var startDate = req.body.start_date;
    var operatorId = req.operator_id;
    var value = req.body.value;
    var city = req.body.city;
    var title = req.body.title;
    var tnc = req.body.tnc;
    var perDayLimit = req.body.per_day_limit;
    var maxValue = req.body.max_value;
    var userId = req.user_id;
    req.body.created_by = req.email_from_acl;

    var fareFixed = req.body.fare_fixed;
    var fareThresholdDistance = req.body.fare_threshold_distance;
    var farePerKmThresholdDistance = req.body.fare_per_km_threshold_distance;
    var farePerKmBeforeThresholdDistance =
      req.body.fare_per_km_before_threshold;
    var farePerKmAfterThresholdDistance = req.body.fare_per_km_after_threshold;
    var regionId = req.body.region_id;
    var requestRideType = req.request_ride_type;
    req.body.service_type = requestRideType;

    req.body.allowed_vehicles = Helper.PROMO.formatAllowedVehiclesString(
      req.body.allowed_vehicles,
    );

    var allowedVehicles = req.body.allowed_vehicles; //invalid allowed_vehicles will result is an empty string

    var mandatoryFields = [
      city,
      benefitType,
      promoType,
      endDate,
      startDate,
      title,
      tnc,
      perDayLimit,
      operatorId,
    ];

    if (benefitType == PromoConstant.BENEFIT_TYPE.MARKETING_FARE) {
      mandatoryFields.push(
        fareFixed,
        fareThresholdDistance,
        farePerKmThresholdDistance,
        farePerKmBeforeThresholdDistance,
        farePerKmAfterThresholdDistance,
        regionId,
      );
    } else {
      mandatoryFields.push(value, maxValue);
    }
    if (req.body.is_pass == 1) {
      if (!req.body.validity || !req.body.amount) {
        response = {
          flag: ResponseConstants.RESPONSE_STATUS.SHOW_ERROR_MESSAGE,
          message: 'Validity or Amount can not be null for Passes',
        };
        return res.send(response);
      }
      var start = moment(startDate, 'YYYY-MM-DD HH:mm:ss');
      var end = moment(endDate, 'YYYY-MM-DD HH:mm:ss');
      var validity = req.body.validity;
      var minimumEndDate = moment(start).add(validity, 'days');

      if (end < minimumEndDate) {
        response = {
          flag: ResponseConstants.RESPONSE_STATUS.SHOW_ERROR_MESSAGE,
          message: 'End Date should be greater than the validity',
        };
        return res.send(response);
      }
    }
    if (
      !Helper.PROMO.isPromoValid(req.body, PromoConstant.PROMOTION_TYPE.PROMOS)
    ) {
      response = {
        flag: ResponseConstants.RESPONSE_STATUS.ACTION_FAILED,
        message: 'Trying to add wrong promo. Please try again.',
      };
      return res.send(response);
    }
    var promoObject = makePromo(operatorId, req.body);
    await db.InsertIntoTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.GLOBAL_PROMO}`,
      promoObject,
    );
    /*var logObject = {
      user_id: userId,
      promo_type: PromoConstant.PROMOTION_TYPE.PROMOS,
      event_type: PromoConstant.PROMOTION_EVENT.CREATED,
      operator_id: operatorId,
      meta_data: JSON.stringify(req.body),
    };
    await db.InsertIntoTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.PROMOTION_LOGS}`,
      logObject,
    ); */
    return responseHandler.success(req, res, 'Promo added successfully', []);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

function makePromo(operatorId, promoObj) {
  var locationsCoordinates = 0;
  var multipleLocationsAllowed = 0;
  var latitude = 0;
  var longitude = 0;

  if (promoObj.promo_type != PromoConstant.PROMO_TYPE.LOCATION_INSENSITIVE) {
    locationsCoordinates = JSON.parse(promoObj.locations_coordinates);
    if (locationsCoordinates.length == 1) {
      latitude = locationsCoordinates[0].lat;
      longitude = locationsCoordinates[0].lng;
      locationsCoordinates = 0;
    } else if (locationsCoordinates.length > 1) {
      locationsCoordinates =
        Helper.PROMO.formatMultipleLocationsCoordinates(locationsCoordinates);
      multipleLocationsAllowed = 1;
    }
  }
  var promo = {
    operator_id: operatorId,
    is_active: 1,
    title: promoObj.title,
    promo_type: promoObj.promo_type,
    promo_provider: 0,
    benefit_type: promoObj.benefit_type,
    allowed_vehicles: promoObj.allowed_vehicles,
    multiple_locations_allowed: multipleLocationsAllowed,
    discount_percentage:
      promoObj.benefit_type == PromoConstant.BENEFIT_TYPE.DISCOUNT
        ? promoObj.value
        : 0,
    discount_maximum:
      promoObj.benefit_type == PromoConstant.BENEFIT_TYPE.DISCOUNT
        ? promoObj.max_value
        : 0,
    cashback_percentage:
      promoObj.benefit_type == PromoConstant.BENEFIT_TYPE.CASHBACK
        ? promoObj.value
        : 0,
    cashback_maximum:
      promoObj.benefit_type == PromoConstant.BENEFIT_TYPE.CASHBACK
        ? promoObj.max_value
        : 0,
    capped_fare:
      promoObj.benefit_type == PromoConstant.BENEFIT_TYPE.CAPPED_FARE
        ? promoObj.value
        : -1,
    capped_fare_maximum:
      promoObj.benefit_type == PromoConstant.BENEFIT_TYPE.CAPPED_FARE
        ? promoObj.max_value
        : -1,
    city: promoObj.city,
    pickup_latitude:
      promoObj.promo_type == PromoConstant.PROMO_TYPE.PICK_UP_BASED
        ? latitude
        : 0,
    pickup_longitude:
      promoObj.promo_type == PromoConstant.PROMO_TYPE.PICK_UP_BASED
        ? longitude
        : 0,
    pickup_radius:
      promoObj.promo_type == PromoConstant.PROMO_TYPE.PICK_UP_BASED
        ? promoObj.pickup_radius
        : 0,
    drop_latitude:
      promoObj.promo_type == PromoConstant.PROMO_TYPE.DROP_BASED ? latitude : 0,
    drop_longitude:
      promoObj.promo_type == PromoConstant.PROMO_TYPE.DROP_BASED
        ? longitude
        : 0,
    drop_radius:
      promoObj.promo_type == PromoConstant.PROMO_TYPE.DROP_BASED
        ? promoObj.drop_radius
        : 0,
    is_location_based:
      promoObj.promo_type == PromoConstant.PROMO_TYPE.LOCATION_INSENSITIVE
        ? 0
        : 1,
    locations_coordinates: locationsCoordinates,
    max_allowed: promoObj.max_allowed,
    current_usage_count: 0,
    per_user_limit: promoObj.per_user_limit || 1,
    per_day_limit: promoObj.per_day_limit || 1,
    terms_n_conds: promoObj.tnc,
    start_from: promoObj.start_date,
    end_on: promoObj.end_date,
    comments: promoObj.comments || '',
    created_by: promoObj.created_by,
    is_pass: promoObj.is_pass,
    amount: promoObj.amount,
    validity: promoObj.validity,
    is_selected: promoObj.is_pass ? 1 : 0,
    service_type: promoObj.service_type,
  };
  return promo;
}

exports.promotionList = async function (req, res) {
  try {
    let promoType = req.query.promo_type;
    let operatorId = req.operator_id;
    let requestRideType = req.request_ride_type;
    let cityId = parseInt(req.query.city_id);

    let response = {};
    let promoList;

    switch (+promoType) {
      case 1:
        promoList = await getCityWidePromos(
          cityId,
          operatorId,
          requestRideType,
        );
        break;
      case 2:
        promoList = await getCoupons(operatorId, undefined, requestRideType);
        break;
      case 3:
        promoList = await getAuthCoupons(operatorId, cityId, requestRideType);
        break;
    }
    return responseHandler.success(req, res, 'Promo fetched', promoList);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

async function getCityWidePromos(cityId, operatorId, requestRideType) {
  let promosQuery = `SELECT promo_id, title, promo_type, multiple_locations_allowed, benefit_type, discount_percentage, discount_maximum, capped_fare, 
            capped_fare_maximum, cashback_percentage,cashback_maximum, is_active, promo_provider,
            city, start_time, end_time, start_from, end_on, locations_coordinates, max_allowed, terms_n_conds, per_user_limit, current_usage_count, is_selected,
            allowed_vehicles, per_day_limit,
            pickup_radius, pickup_latitude, pickup_longitude,  drop_radius, drop_latitude, drop_longitude, fare_id,
            CASE
            WHEN is_active = 1 AND  start_from < NOW() AND end_on >= NOW() THEN 1
            ELSE 0 END AS is_promo_active
            FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.GLOBAL_PROMO} 
            WHERE city =? AND operator_id = ? AND service_type = ? `;

  let cityWidePromos = await db.RunQuery(dbConstants.DBS.LIVE_DB, promosQuery, [
    cityId,
    operatorId,
    requestRideType,
  ]);

  let finalCityWidePromos = filterPromotionsList(cityWidePromos);
  return finalCityWidePromos;
}

async function getAuthCoupons(operatorId, cityId, requestRideType) {
  cityId = parseInt(cityId);
  const values = [operatorId];
  let whereClause = ``;

  if (cityId) {
    whereClause += ` AND city_id REGEXP ?`;
    const cityIdRegex = `^${cityId},|,${cityId},|^${cityId}$|,${cityId}$`; // Build the REGEXP pattern
    values.push(cityIdRegex);
  }

  // Add `requestRideType` to values
  values.push(requestRideType);

  let couponQuery = `
    SELECT 
      promo_code, 
      money_to_add, 
      bonus_type, 
      city_id, 
      coupons_validity_autos, 
      start_date, 
      end_date, 
      max_number, 
      num_redeemed, 
      promo_type, 
      login_type AS user_type,
      (CASE 
        WHEN (start_date <= NOW() AND end_date >= NOW()) THEN 1 
        ELSE 0 
      END) AS is_active, 
      coupon_id_autos, 
      promo_id, 
      promo_owner_client_id
    FROM ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.AUTH_PROMO}
    WHERE operator_id = ? ${whereClause} AND service_type = ?
    ORDER BY promo_id DESC
  `;

  // Execute the query
  let coupons = await db.RunQuery(dbConstants.DBS.AUTH_DB, couponQuery, values);
  return coupons;
}

async function getCoupons(operatorId, couponId, requestRideType, cityId) {
  const values = [operatorId, requestRideType]; // Initialize the values array
  let whereClause = ``; // Initialize the whereClause variable

  // Add cityId condition if it exists
  if (cityId) {
    whereClause += ` AND city_id REGEXP ?`;
    const cityIdRegex = `^${cityId},|,${cityId},|^${cityId}$|,${cityId}$`; // Build the REGEXP pattern
    values.push(cityIdRegex);
  }

  // Construct the coupons query
  let couponsQuery = `
    SELECT 
      coupon_id, 
      title,
      subtitle,
      description, 
      coupon_type AS promo_type,
      benefit_type, 
      discount_percentage,
      discount_maximum, 
      cashback_percentage, 
      cashback_maximum, 
      capped_fare, 
      capped_fare_maximum, 
      pickup_radius,
      no_coupons_to_give,
      is_active, 
      allowed_vehicles, 
      pickup_latitude, 
      pickup_longitude,  
      drop_radius, 
      drop_latitude, 
      drop_longitude, 
      fare_id, 
      usuage AS current_usage_count,  
      CASE 
        WHEN is_active = 1 THEN 1
        ELSE 0 
      END AS is_coupon_active
    FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.COUPONS}
    WHERE operator_id = ? AND service_type = ? ${whereClause}
  `;

  // Add couponId condition if it exists
  if (couponId) {
    couponsQuery += ` AND coupon_id = ? AND is_active = 1`;
    values.push(couponId);
  }

  // Execute the query
  let coupons = await db.RunQuery(
    dbConstants.DBS.LIVE_DB,
    couponsQuery,
    values,
  );
  return coupons;
}

function filterPromotionsList(promoObject) {
  for (let i in promoObject) {
    promoObject[i].discount_type = Helper.PROMO.getDiscountType(
      promoObject[i].discount_percentage,
      promoObject[i].cashback_percentage,
      promoObject[i].capped_fare,
      promoObject[i].benefit_type,
    );

    promoObject[i].value = Helper.PROMO.getDiscountValue(
      promoObject[i].capped_fare,
      promoObject[i].cashback_percentage,
      promoObject[i].cashback_maximum,
      promoObject[i].discount_percentage,
      promoObject[i].discount_maximum,
    );
    promoObject[i].latitude = 0;
    promoObject[i].longitude = 0;
    promoObject[i].radius = 0;
    if (promoObject[i].promo_type == PromoConstant.PROMO_TYPE.PICK_UP_BASED) {
      if (
        !promoObject[i].locations_coordinates ||
        promoObject[i].locations_coordinates === '0'
      ) {
        promoObject[i].latitude = promoObject[i].pickup_latitude;
        promoObject[i].longitude = promoObject[i].pickup_longitude;
      } else {
        promoObject[i].locations_coordinates =
          Helper.PROMO.parseLocationsCoordinates(
            promoObject[i].locations_coordinates,
          );
      }
      promoObject[i].radius = promoObject[i].pickup_radius;
    }
    if (promoObject[i].promo_type == PromoConstant.PROMO_TYPE.DROP_BASED) {
      if (
        !promoObject[i].locations_coordinates ||
        promoObject[i].locations_coordinates === '0'
      ) {
        promoObject[i].latitude = promoObject[i].drop_latitude;
        promoObject[i].longitude = promoObject[i].drop_longitude;
      } else {
        promoObject[i].locations_coordinates =
          Helper.PROMO.parseLocationsCoordinates(
            promoObject[i].locations_coordinates,
          );
      }
      promoObject[i].radius = promoObject[i].drop_radius;
    }
    delete promoObject[i].drop_latitude;
    delete promoObject[i].drop_longitude;
    delete promoObject[i].drop_radius;
    delete promoObject[i].pickup_latitude;
    delete promoObject[i].pickup_longitude;
    delete promoObject[i].pickup_radius;
  }
  return promoObject;
}

exports.createAuthPromo = async function (req, res) {
  try {
    let operatorId = (req.body.operator_id = req.operator_id);
    let couponId = req.body.coupon_id_autos;
    let bonusType = +req.body.bonus_type;
    let count = req.body.count;
    let loginType = (req.body.user_type =
      req.body.user_type || GeneralConstant.loginType.CUSTOMER);
    let startDate = moment(req.body.start_date, 'YYYY-MM-DD').format(
      'YYYY-MM-DD HH:mm:ss',
    );
    let endDate = moment(req.body.end_date, 'YYYY-MM-DD').format(
      'YYYY-MM-DD HH:mm:ss',
    );
    let walletSerialNumber = req.body.wallet_serial_number;
    let requestRideType = req.request_ride_type;

    if (loginType == GeneralConstant.loginType.DRIVER) {
      req.body.coupons_validity_autos = moment
        .duration(endDate.diff(startDate))
        .asDays();
    }
    const schema = Joi.object({
      token: Joi.string().required(),
      operator_id: Joi.number().integer().positive().required(),
      bonus_type: Joi.number().required(),
      user_type: Joi.number().required(),
      coupon_id_autos: Joi.number().when('bonus_type', {
        is: PromoConstant.authPromotionBonusType.COUPON,
        then: Joi.number().required(),
        otherwise: Joi.forbidden(),
      }),
      amount: Joi.number().when('bonus_type', {
        is: PromoConstant.authPromotionBonusType.CASH,
        then: Joi.number().positive().required(),
        otherwise: Joi.forbidden(),
      }),
      max_number: Joi.number().positive().required(),
      start_date: Joi.string().required(),
      end_date: Joi.string().required(),
      promo_code: Joi.string().when('user_type', {
        is: GeneralConstant.loginType.CUSTOMER,
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
      }),
      coupons_validity_autos: Joi.number().positive().required(),
      offering_type: Joi.number().optional(),
      count: Joi.number().when('user_type', {
        is: GeneralConstant.loginType.DRIVER,
        then: Joi.number().required(),
        otherwise: Joi.forbidden(),
      }),
      city_id: Joi.optional(),
      wallet_serial_number: Joi.string().length(4).optional(),
      service_type: Joi.string().allow('').optional(),
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    let driverWalletCardEnabled = {};
    const clientId =
      authConstants.OFFERING_TYPE[req.body.offering_type] ||
      authConstants.CLIENTS_ID.AUTOS_CLIENT_ID;
    req.body.service_type = requestRideType;

    if (loginType == generalConstants.loginType.DRIVER) {
      req.body.max_number = 1; // Driver can use the wallet card only once.
      if (count > authConstants.driverWalletCardsInOneGo.MAX) {
        count = authConstants.driverWalletCardsInOneGo.MAX;
      }
    }

    await getOperatorParameters(
      ['driver_wallet_card_enabled'],
      operatorId,
      driverWalletCardEnabled,
    );

    if (
      loginType == generalConstants.loginType.DRIVER &&
      driverWalletCardEnabled == generalConstants.ACTIVE_STATUS.INACTIVE
    ) {
      throw new Error('Driver Wallet Card not enabled.');
    }
    req.body.login_type = req.body.user_type;

    if (bonusType == PromoConstant.authPromotionBonusType.COUPON) {
      let couponsQuery = `SELECT coupon_id, title,subtitle,description, coupon_type AS promo_type,
        benefit_type, discount_percentage,discount_maximum, cashback_percentage, cashback_maximum, capped_fare, capped_fare_maximum, pickup_radius,no_coupons_to_give,
        is_active, allowed_vehicles, pickup_radius, pickup_latitude, pickup_longitude,  drop_radius, drop_latitude, drop_longitude, fare_id, usuage AS current_usage_count,  
        CASE 
        WHEN is_active = 1 THEN 1
        ELSE 0 END AS is_coupon_active
        FROM venus_live.tb_coupons
        WHERE operator_id = ? AND service_type = ? AND coupon_id = ?`;

      let values = [operatorId, requestRideType, couponId];

      var coupons = await db.RunQuery(
        dbConstants.DBS.LIVE_DB,
        couponsQuery,
        values,
      );

      let couponCheck = filterPromotionsList(coupons);

      if (!couponCheck.length) {
        throw new Error('No such coupon exists.');
      }
      req.body.amount = 50; //random value in case of coupons
    }
    req.body.client_id = clientId;

    var promotionArr = [];

    // if (phone_no && (phone_no.length != 10 ||
    //   isNaN(parseInt(phoneNo.slice(-10))))) {
    //   return res.send("Invalid phone number");
    // }

    if (loginType == rideConstants.LOGIN_TYPE.DRIVER) {
      /*
        PENDING
        */
      // if (count) {
      //     await createPromotionForDriver();
      // }
    } else {
      //   //Means user_type/login_type is either not defined or set to default by sm-panel.
      //   if (!req.body.promo_code) {
      //     throw new Error('Invalid promo code');
      //   }

      //   let promoCode = req.body.promo_code

      //   promoCode = promoCode.trim();
      //   if (req.body.promo_code === '') {
      //     throw new Error('Invalid promo code');
      //   }

      //   var stmnt = `SELECT COUNT(*) as num, 'promo' as type
      //       FROM
      //    ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.AUTH_PROMO}
      //       WHERE promo_code = ? AND operator_id = ? AND (
      //        ( ? >=start_date AND ? <= end_date ) OR
      //        ( ? <= start_date AND ? >= start_date)) AND
      //        end_date >= NOW()

      //    UNION

      //    SELECT COUNT(*) as num, 'referral' as type
      //       FROM
      //    ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.CUSTOMERS}
      //       WHERE referral_code = ? AND operator_id = ?`;

      //   var promoExistenceArray = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmnt, [
      //     promoCode, operatorId, req.body.start_date, req.body.start_date, req.body.start_date, req.body.end_date, promoCode, operatorId
      //   ]);

      //   var promoExists = promoExistenceArray.filter((element) => {
      //     return element.type == 'promo';
      //   });

      //   var referralExists = promoExistenceArray.filter((element) => {
      //     return element.type == 'referral';
      //   });

      //   if (promoExists[0].num > 0 || referralExists[0].num > 0) {
      //     response = 'This promotion code already exists';
      //     return response;
      //   }

      //   if (!body.master_id) {
      //     var stmnt = "SELECT COALESCE(MAX(master_id),0)+1 AS new_master_id FROM tb_promotions FOR UPDATE";

      //     var promoMasterObj = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmnt, []);

      //     if (!promoMasterObj || !promoMasterObj.length) {
      //         throw new Error('Failed to select master id');
      //     }
      //    var  masterId = promoMasterObj[0].new_master_id;
      // }

      var promotion = {
        promo_code: req.body.promo_code,
        money_to_add: req.body.amount, //to be chaned
        validity_window: req.body.validity_window || -1,
        start_date: startDate || new Date(),
        end_date: endDate || '2017-12-31 23:59:00',
        can_use_with_referral: req.body.can_user_with_referral || 0,
        max_number: req.body.max_number,
        num_redeemed: 0,
        notify_user: 1,
        notify_sales: 'abc',
        sales_email: 'abc',
        promo_type: 3,
        coupon_id_autos: req.body.coupon_id_autos,
        num_coupons_autos: req.body.max_number,
        promo_owner_client_id: req.body.client_id || '',
        bonus_type: req.body.bonus_type || 0,
        operator_id: operatorId,
        city_id: req.body.city_id,
        service_type: req.request_ride_type,
      };

      console.log(promotion);

      // if (phoneNo)
      //     promotion.sales_phone_no = phoneNo;

      // if (couponsValidityAutos) {
      //     promotion.coupons_validity_autos = couponsValidityAutos;
      // }

      await db.InsertIntoTable(
        dbConstants.DBS.AUTH_DB,
        `${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.AUTH_PROMO}`,
        promotion,
      );
    }

    // call Auth Server.

    return responseHandler.success(req, res, 'User Details Sents', []);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.deactivateAuthPromo = async function (req, res) {
  try {
    var body = req.body;
    var promoId = body.promo_id;
    var operatorId = req.operator_id;

    if (checkBlank([promoId])) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var deactivateQuery = `UPDATE
    ${dbConstants.DBS.AUTH_DB}.tb_promotions
SET
    autos_coupon_expiry_date = DATE(DATE_ADD(NOW(), INTERVAL -1 SECOND)),
    end_date = DATE_ADD(NOW(), INTERVAL -1 SECOND)
WHERE
    operator_id = ?
    AND end_date > NOW()
    AND promo_id = ?`;

    await db.RunQuery(dbConstants.DBS.LIVE_DB, deactivateQuery, [
      operatorId,
      promoId,
    ]);

    return responseHandler.success(
      req,
      res,
      'PromoCode deactivate successfully.',
      {},
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.editPromo = async function (req, res) {
  try {
    var promoId = req.body.promo_id;
    var operatorId = req.operator_id;
    var userId = req.user_id;
    var isActive = req.body.is_active;
    var updatedBy = req.email_from_acl;

    var mandatoryFields = [promoId];
    if (checkBlank(mandatoryFields)) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    if (isActive) {
      isActive = +isActive > 0 ? 1 : 0;
    }

    //list of columns in tb_ride_promotions and tb_fare which are allowed to be updated
    var promoKeyList = [
      'title',
      'value',
      'max_value',
      'per_user_limit',
      'per_day_limit',
      'tnc',
      'max_allowed',
      'is_selected',
    ];
    var fareKeyList = [
      'fare_fixed',
      'fare_threshold_distance',
      'fare_per_km_threshold_distance',
      'fare_per_km_after_threshold',
      'fare_per_km_before_threshold',
      'fare_per_min',
      'fare_threshold_time',
      'fare_per_waiting_min',
      'fare_threshold_waiting_time',
    ];

    //retrieve promo details
    var requiredKeysPromo = [
      'promo_id',
      'promo_type',
      'benefit_type',
      'is_active',
      'is_selected',
      'fare_id',
    ];
    var promoCriteria = [
      { key: 'operator_id', value: operatorId },
      { key: 'promo_id', value: promoId },
      { key: 'is_active', value: 1 },
    ];

    var promoDetails = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.GLOBAL_PROMO}`,
      requiredKeysPromo,
      promoCriteria,
    );
    promoDetails = promoDetails[0];

    if (!promoDetails) {
      throw new Error('No promo found for this operator.');
    }
    /**
     * Promo deactivation has the first priority followed by general
     * updates. The above mentioned operations are handled as mutually exclusive.
     * */
    if (+isActive == 0) {
      var promoQuery = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.GLOBAL_PROMO} SET is_active = ?, updated_by = ? WHERE promo_id = ? AND is_active = 1 AND operator_id = ? `;

      await db.RunQuery(dbConstants.DBS.LIVE_DB, promoQuery, [
        0,
        updatedBy,
        promoId,
        operatorId,
      ]);
    } else {
      var fareCriteria = [];
      if (promoDetails.fare_id) {
        fareCriteria.push({ key: 'id', value: promoDetails.fare_id });
      }
      //creating the promoUpdateKeys, an object of <promoColumnName: newValue> pairs.
      var promoUpdateKeys = {};
      for (var key of promoKeyList) {
        if (req.body[key]) {
          if (key == 'value') {
            //modify the key 'value' according to the corresponding benefit_type
            switch (promoDetails.benefit_type) {
              case PromoConstant.BENEFIT_TYPE.DISCOUNT:
                promoUpdateKeys['discount_percentage'] = req.body[key];
                break;
              case PromoConstant.BENEFIT_TYPE.CAPPED_FARE:
                promoUpdateKeys['capped_fare'] = req.body[key];
                break;
              case PromoConstant.BENEFIT_TYPE.CASHBACK:
                promoUpdateKeys['cashback_percentage'] = req.body[key];
                break;
              case PromoConstant.BENEFIT_TYPE.MARKETING_FARE:
                break;
            }
          } else if (key == 'max_value') {
            //modify the key 'max_value' according to the corresponding benefit_type
            switch (promoDetails.benefit_type) {
              case PromoConstant.BENEFIT_TYPE.DISCOUNT:
                promoUpdateKeys['discount_maximum'] = req.body[key];
                break;
              case PromoConstant.BENEFIT_TYPE.CAPPED_FARE:
                promoUpdateKeys['capped_fare_maximum'] = req.body[key];
                break;
              case PromoConstant.BENEFIT_TYPE.CASHBACK:
                promoUpdateKeys['cashback_maximum'] = req.body[key];
                break;
              case PromoConstant.BENEFIT_TYPE.MARKETING_FARE:
                break;
            }
          } else if (key == 'tnc') {
            promoUpdateKeys['terms_n_conds'] = req.body[key];
          } else {
            promoUpdateKeys[key] = req.body[key];
          }
        }
      }

      //creating the fareUpdateKeys, an object of <fareColumnName: newValue> pairs
      var fareUpdateKeys = {};
      if (promoDetails.fare_id) {
        for (var key of fareKeyList) {
          if (req.body[key]) {
            fareUpdateKeys[key] = req.body[key];
          }
        }
      }

      if (!Helper.isEmptyObject(promoUpdateKeys)) {
        if (!Helper.isEmptyObject(fareUpdateKeys)) {
          //update fare and promo in a transaction
          promoUpdateKeys['updated_by'] = updatedBy;

          await db.updateTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.GLOBAL_PROMO}`,
            promoUpdateKeys,
            promoCriteria,
          );

          await db.updateTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_FARE}`,
            fareUpdateKeys,
            fareCriteria,
          );
        } else {
          //update promo only
          promoUpdateKeys['updated_by'] = updatedBy;
          await db.updateTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.GLOBAL_PROMO}`,
            promoUpdateKeys,
            promoCriteria,
          );
        }
      } else if (!Helper.isEmptyObject(fareUpdateKeys)) {
        //update fare only
        await db.updateTable(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_FARE}`,
          fareUpdateKeys,
          fareCriteria,
        );
      } else {
        throw Error('Nothing to update.');
      }
    }
    return responseHandler.success(req, res, 'Promo edited successfully.', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.editAuthPromotion = async function (req, res) {
  try {
    req.body.operator_id = req.operator_id;
    var emailId = '';

    const schema = Joi.object({
      token: Joi.string().required(),
      operator_id: Joi.number().integer().positive().required(),
      user_type: Joi.number().required(),
      promo_code: Joi.string().when('user_type', {
        is: generalConstants.loginType.CUSTOMER,
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
      }),
      city_id: Joi.optional(),
    });

    const result = schema.validate(req.body);
    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var notifySales = emailId == '' ? 0 : 1;
    var updatePromo = `UPDATE ${dbConstants.DBS.AUTH_DB}.tb_promotions SET sales_email = ?, notify_sales = ?, city_id = ? WHERE promo_code = ? AND operator_id = ? `;

    await db.RunQuery(dbConstants.DBS.LIVE_DB, updatePromo, [
      emailId,
      notifySales,
      req.body.city_id,
      req.body.promo_code,
      req.operator_id,
    ]);

    return responseHandler.success(
      req,
      res,
      'PromoCode edited successfully.',
      {},
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.insertCoupon = async function (req, res) {
  try {
    var benefitType = req.body.benefit_type;
    var couponType = req.body.coupon_type;
    var operatorId = req.operator_id;
    var value = req.body.value;
    var title = req.body.title;
    var description = req.body.description;
    var maxValue = req.body.max_value;
    var noOfCouponsToGive = req.body.no_coupons_to_give;
    var userId = req.user_id;
    req.body.created_by = req.email_from_acl;

    var fareFixed = req.body.fare_fixed;
    var fareThresholdDistance = req.body.fare_threshold_distance;
    var farePerKmThresholdDistance = req.body.fare_per_km_threshold_distance;
    var farePerKmBeforeThresholdDistance =
      req.body.fare_per_km_before_threshold;
    var farePerKmAfterThresholdDistance = req.body.fare_per_km_after_threshold;
    var regionId = req.body.region_id;
    var city = req.body.city;
    var requestRideType = req.request_ride_type;
    req.body.service_type = requestRideType;

    req.body.allowed_vehicles =
      Helper.PROMO.formatAllowedVehiclesString(allowedVehicles);
    var allowedVehicles = req.body.allowed_vehicles;

    var mandatoryFields = [
      benefitType,
      couponType,
      title,
      description,
      operatorId,
      noOfCouponsToGive,
    ];

    if (benefitType == PromoConstant.BENEFIT_TYPE.MARKETING_FARE) {
      mandatoryFields.push(
        fareFixed,
        fareThresholdDistance,
        farePerKmThresholdDistance,
        farePerKmBeforeThresholdDistance,
        farePerKmAfterThresholdDistance,
        regionId,
        city,
      );
    } else {
      mandatoryFields.push(value, maxValue);
    }

    if (
      checkBlank(mandatoryFields) ||
      (benefitType != PromoConstant.BENEFIT_TYPE.MARKETING_FARE &&
        benefitType != PromoConstant.BENEFIT_TYPE.CAPPED_FARE &&
        (+maxValue <= 0 || +value <= 0))
    ) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    if (
      !Helper.PROMO.isPromoValid(req.body, PromoConstant.PROMOTION_TYPE.COUPONS)
    ) {
      throw new Error('Trying to add wrong Coupon. Please try again.');
    }

    var couponObject = Helper.makeCoupon(operatorId, req.body);

    if (benefitType == PromoConstant.BENEFIT_TYPE.MARKETING_FARE) {
      /* 
      PENDING
      */
      // var fareObject = await Helper.makeFare(handlerInfo, operatorId, req.body);
      // await insertMarketingFarePromo(handlerInfo, fareObject, "tb_coupons", couponObject);
    } else {
      await db.InsertIntoTable(
        dbConstants.DBS.LIVE_DB,
        `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.COUPONS}`,
        couponObject,
      );
    }

    return responseHandler.success(req, res, 'Coupons added successfully.', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.editCoupon = async function (req, res) {
  try {
    var couponId = req.body.coupon_id;
    var reason = req.body.reason;
    var operatorId = req.operator_id;
    var aclUserId = req.user_id;
    var isActive = req.body.is_active;
    req.body.updated_by = req.email_from_acl;

    if (isActive) {
      isActive = +isActive > 0 ? 1 : 0;
    }

    var mandatoryFields = [couponId];
    if (+isActive == 0) {
      mandatoryFields.push(reason);
    }
    if (checkBlank(mandatoryFields)) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    //list of columns in tb_coupons and tb_fare which are allowed to be updated
    var couponKeyList = ['title', 'subtitle', 'description', 'is_selected'];
    var fareKeyList = [
      'fare_fixed',
      'fare_threshold_distance',
      'fare_per_km_threshold_distance',
      'fare_per_km_after_threshold',
      'fare_per_km_before_threshold',
      'fare_per_min',
      'fare_threshold_time',
      'fare_per_waiting_min',
      'fare_threshold_waiting_time',
    ];

    //retrieve the coupon/validate coupon
    var couponDetails = {};
    var requiredKeysCoupon = [
      'coupon_id',
      'coupon_type',
      'benefit_type',
      'is_active',
      'fare_id',
    ];
    var couponCriteria = [
      { key: 'operator_id', value: operatorId },
      { key: 'coupon_id', value: couponId },
      { key: 'is_active', value: 1 },
    ];

    var couponDetails = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.COUPONS}`,
      requiredKeysCoupon,
      couponCriteria,
    );
    couponDetails = couponDetails[0];

    if (!couponDetails) {
      throw new Error('No coupon found for this operator.');
    }

    /**
     * Coupon deactivation is the first priority followed
     * by other general updates. These operations are
     * mutually exclusive.
     */
    if (+isActive == 0) {
      /* 
      PENDING
      */
      var promoQuery = `UPDATE ${dbConstants.DBS.LIVE_DB}.tb_coupons SET is_active = ?, updated_by = ? WHERE coupon_id = ? AND is_active = 1 AND operator_id = ? `;

      await db.RunQuery(dbConstants.DBS.LIVE_DB, promoQuery, [
        isActive,
        req.email_from_acl,
        couponId,
        operatorId,
      ]);

      removeCouponQuery = `UPDATE ${dbConstants.DBS.LIVE_DB}.tb_accounts SET status = ?, reason = ? WHERE coupon_id = ? AND status = ? `;

      await db.RunQuery(dbConstants.DBS.LIVE_DB, removeCouponQuery, [
        0,
        reason,
        couponId,
        1,
      ]);

      var deactivateQuery = `UPDATE
      ${dbConstants.DBS.AUTH_DB}.tb_promotions
  SET
      autos_coupon_expiry_date = DATE(DATE_ADD(NOW(), INTERVAL -1 SECOND)),
      end_date = DATE_ADD(NOW(), INTERVAL -1 SECOND)
  WHERE
      operator_id = ?
      AND end_date > NOW()
      AND coupon_id_autos = ?`;

      await db.RunQuery(dbConstants.DBS.LIVE_DB, deactivateQuery, [
        operatorId,
        couponId,
      ]);
    } else {
      var fareCriteria = [];
      if (couponDetails.fare_id) {
        fareCriteria.push({ key: 'id', value: couponDetails.fare_id });
      }
      //creating the couponUpdateKeys, an Object of <couponColumnName: newValue> pairs.
      var couponUpdateKeys = {};
      for (var key of couponKeyList) {
        if (req.body[key]) {
          couponUpdateKeys[key] = req.body[key];
        }
      }

      //creating the fareUpdateKeys, an object of <fareColumnName: newValue> pairs
      var fareUpdateKeys = {};
      if (couponDetails.fare_id) {
        for (var key of fareKeyList) {
          if (req.body[key]) {
            fareUpdateKeys[key] = req.body[key];
          }
        }
      }

      if (!Helper.isEmptyObject(couponUpdateKeys)) {
        if (!Helper.isEmptyObject(fareUpdateKeys)) {
          //update fare and coupon in a transaction
          couponUpdateKeys['updated_by'] = req.body.updated_by;

          await db.updateTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.COUPONS}`,
            couponUpdateKeys,
            couponCriteria,
          );

          await db.updateTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_FARE}`,
            fareUpdateKeys,
            fareCriteria,
          );
        } else {
          //update the coupon only
          couponUpdateKeys['updated_by'] = req.body.updated_by;
          await db.updateTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.COUPONS}`,
            couponUpdateKeys,
            couponCriteria,
          );
        }
      } else if (!Helper.isEmptyObject(fareUpdateKeys)) {
        //update only fare
        await db.updateTable(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_FARE}`,
          fareUpdateKeys,
          fareCriteria,
        );
      } else {
        throw Error('Nothing to update.');
      }
    }
    return responseHandler.success(req, res, 'Coupon edited successfully.', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
