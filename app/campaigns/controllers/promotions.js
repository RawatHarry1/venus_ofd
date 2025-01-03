const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
} = require('../../../bootstart/header');

const PromoConstant = require('../../../constants/campaings');
const GeneralConstant = require('../../../constants/general');
const Helper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');
var moment = require('moment');

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
    return responseHandler.success(req, res, 'User Details Sents', promoList);
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
    FROM ${dbConstants.DBS.AUTH_DB}.tb_promotions
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
    FROM ${dbConstants.DBS.LIVE_DB}.tb_coupons
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
    let startDate = moment(req.body.start_date, 'YYYY-MM-DD');
    let endDate = moment(req.body.end_date, 'YYYY-MM-DD');
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
      let response = {
        flag: ResponseConstants.RESPONSE_STATUS.ACTION_FAILED,
        message: 'Some parameters are not valid.',
      };
      return res.send(response);
    }

    return responseHandler.success(req, res, 'User Details Sents', []);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
