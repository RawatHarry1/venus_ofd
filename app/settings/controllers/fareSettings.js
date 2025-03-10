const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  rideConstants,
  ResponseConstants,
  generalConstants,
} = require('../../../bootstart/header');
var moment = require('moment');
var Joi = require('joi');
const Helper = require('../helper');
const rideConstant = require('../../../constants/rideConstants');
const { checkBlank } = require('../../rides/helper');

exports.fetchOperatorVehicleType = async function (req, res) {
  try {
    var operatorId = req.operator_id;
    var requestRideType = req.request_ride_type;
    var city = parseInt(req.body.city_id) || 0;
    var values = [operatorId];
    var queryToFetchOperatorVehicleType = `SELECT region_name, display_order, convenience_charge, waiting_charges_applicable, max_people,destination_mandatory, fare_mandatory, convenience_charge_waiver, convenience_venus_cut,vehicle_tax, fixed_commission, subscription_charge, images, region_id, ride_type, city_id, min_driver_balance,vehicle_type, is_active, customer_notes_enabled, reverse_bidding_enabled, applicable_gender,	is_rental_vehicle, config  FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SUB_REGIONS} WHERE operator_id = ?`;
    if (city > 0) {
      queryToFetchOperatorVehicleType += ' AND city_id = ?';
      values.push(city);
    }
    if (requestRideType == rideConstants.CLIENTS.MARS) {
      queryToFetchOperatorVehicleType += ' AND ride_type = ?';
      values.push(rideConstants.CLIENTS_RIDE_TYPE.MARS);
    } else {
      queryToFetchOperatorVehicleType += ' AND ride_type In (?, ?)';
      values.push(rideConstants.CLIENTS_RIDE_TYPE.VENUS_TAXI);
      values.push(rideConstants.CLIENTS_RIDE_TYPE.SHUTTLE);
    }
    queryToFetchOperatorVehicleType += ' ORDER BY is_active DESC';
    var result = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queryToFetchOperatorVehicleType,
      values,
    );
    return responseHandler.success(req, res, '', result);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.insertOperatorVehicleType = async function (req, res) {
  try {
    var body = req.body;
    var operatorId = req.operator_id ? req.operator_id : body.operator_id;
    var response = {};

    body.operatorId = operatorId;
    var applicableGender = +body.applicable_gender || null;

    var checkValues = checkBlank([
      body.city_id,
      operatorId,
      body.vehicle_type,
      body.ride_type,
    ]);
    if (checkValues === 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    if (body.city_id <= 0) {
      throw new Error(
        'A required URL parameter or required request body JSON property is missing.',
      );
    }

    var allowableGenderValues = [
      rideConstants.USER_GENDER.MALE,
      rideConstants.USER_GENDER.FEMALE,
      rideConstants.USER_GENDER.OTHERS,
    ];
    if (applicableGender && !~allowableGenderValues.indexOf(applicableGender)) {
      throw new Error('Invalid Parameters.');
    }

    var fareWrapper = {},
      subRegionsWrapper = {},
      cityOperatorWrapper = {},
      vehicleTypeWrapper = {},
      customerDefaultFare = {},
      driverDefaultFare = {},
      cityImageTypeDocument = {};

    var subRegionsReqdKeys = ['region_id', 'ride_type', 'applicable_gender'];
    var fareReqKeys = ['id', 'type'];
    var vehicleTypeReqKeys = ['images'];
    var cityReqKeys = ['operator_id', 'city_id'];

    var vehicleTypeCriteria = [
      { key: 'vehicle_type', value: parseInt(body.vehicle_type) },
      { key: 'is_active', value: 1 },
    ];
    var subRegionsCriteria = [
      { key: 'city_id', value: parseInt(body.city_id) },
      { key: 'operator_id', value: operatorId },
      { key: 'vehicle_type', value: parseInt(body.vehicle_type) },
      { key: 'ride_type', value: parseInt(body.ride_type) },
    ];
    var fareCriteria = [
      { key: 'city', value: parseInt(body.city_id) },
      { key: 'operator_id', value: operatorId },
      { key: 'vehicle_type', value: parseInt(body.vehicle_type) },
      { key: 'ride_type', value: parseInt(body.ride_type) },
      { key: 'business_id', value: 1 },
    ];
    var cityCriteria = [
      { key: 'city_id', value: body.city_id },
      { key: 'operator_id', value: body.operatorId },
    ];
    const requiredDocFields = {
      operator_id: operatorId,
      document_name: 'Driver Image',
      document_type: rideConstants.DOCUMENT_TYPES.IMAGE,
    };
    const cityDocFields = {
      city_id: body.city_id || rideConstants.CITIES.DEFAULT_CITY_ID,
      vehicle_type: parseInt(body.vehicle_type),
      is_required:
        rideConstants.DRIVER_DOCUMENTS_IS_REQUIRED.MANDATORY_REGISTER,
    };

    // Fetch data concurrently
    await Promise.all([
      (async () => {
        vehicleTypeWrapper = await db.SelectFromTableIn(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.tb_vehicle_type`,
          vehicleTypeReqKeys,
          vehicleTypeCriteria,
        );
      })(),
      (async () => {
        subRegionsWrapper = await db.SelectFromTableIn(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SUB_REGIONS}`,
          subRegionsReqdKeys,
          subRegionsCriteria,
        );
      })(),
      (async () => {
        fareWrapper = await db.SelectFromTableIn(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.tb_fare`,
          fareReqKeys,
          fareCriteria,
        );
      })(),
      (async () => {
        cityOperatorWrapper = await db.SelectFromTableIn(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.tb_operator_cities`,
          cityReqKeys,
          cityCriteria,
        );
      })(),
    ]);

    if (body.ride_type == rideConstants.RIDE_TYPE.OUTSTATION) {
      var cityList = await checkIfOperatorCityExists(
        [body.from_city_id, body.to_city_id],
        operatorId,
      );
      if (cityList.length < 2) {
        return responseHandler.returnErrorMessage(
          res,
          `Sorry! You are not active in these cities.`,
        );
      }
    }

    if (subRegionsWrapper.length) {
      return responseHandler.returnErrorMessage(
        res,
        `Sorry! Provided information already exists.`,
      );
    }

    if (
      subRegionsWrapper.length &&
      subRegionsWrapper[0].applicable_gender != applicableGender
    ) {
      return responseHandler.returnErrorMessage(
        res,
        `Please take care of gender associated with the vehicle.`,
      );
    }
    if (!cityOperatorWrapper.length) {
      return responseHandler.returnErrorMessage(
        res,
        `Sorry! You are not active in this city..`,
      );
    }
    if (!vehicleTypeWrapper.length) {
      return responseHandler.returnErrorMessage(
        res,
        `This vehicle type is no more active.`,
      );
    }

    cityImageTypeDocument = await fetchImageTypeDocument(
      operatorId,
      parseInt(body.vehicle_type),
    );

    if (!cityImageTypeDocument.length) {
      var document = await Helper.insertRequiredDocument(requiredDocFields);

      cityDocFields.document_id = document;

      await Helper.insertCityDocument(cityDocFields);
    }

    body.images = vehicleTypeWrapper[0].images;

    let regionId = await Helper.insertCitySubRegion(body);

    body.region_id = regionId;

    if (body.ride_type != rideConstants.RIDE_TYPE.SHUTTLE) {
      /* TODO Have to done */
      if (!fareWrapper.length) {
        customerDefaultFare = await Helper.insertDefaultFares(body, 0);
        driverDefaultFare = await Helper.insertDefaultFares(body, 1);
      } else if (fareWrapper.length == 1) {
        if (fareWrapper[0].type == 0) {
          driverDefaultFare = await Helper.insertDefaultFares(body, 1);
        } else {
          customerDefaultFare = await Helper.insertDefaultFares(body, 0);
        }
      }

      if (!fareWrapper.length || fareWrapper.length == 1) {
        var packageObj = {
          package_name: 'Rental',
          customer_fare_id: Object.keys(customerDefaultFare).length
            ? customerDefaultFare.insertId
            : fareWrapper[0].id,
          driver_fare_id: Object.keys(driverDefaultFare).length
            ? driverDefaultFare.insertId
            : fareWrapper[0].id,
        };

        if (body.ride_type == rideConstants.RIDE_TYPE.RENTAL) {
          //  await utils.insertIntoTable('tb_rental_packages', packageObj);
        } else if (body.ride_type == rideConstants.RIDE_TYPE.OUTSTATION) {
          packageObj.package_name = 'Outstation';
          packageObj.from_city_id = body.from_city_id;
          packageObj.to_city_id = body.to_city_id;
          packageObj.return_trip = body.return_trip;

          //  await utils.insertIntoTable('tb_rental_packages', packageObj);
        }
      }
    }

    response = {
      region_id: regionId,
    };
    return responseHandler.success(
      req,
      res,
      'Inserted new vehicle type!',
      response,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateOperatorVehicleType = async function (req, res) {
  try {
    var body = req.body;
    delete body['token'];
    delete body['$$hashKey'];
    delete body['operator_id'];

    var schema = Joi.object({
      region_id: Joi.number().integer().positive().required(),
      region_name: Joi.string(),
      display_order: Joi.number().integer().min(0),
      max_people: Joi.number().integer().positive().max(30),
      destination_mandatory: Joi.number().integer().min(0).max(1),
      fare_mandatory: Joi.number().integer().min(0).max(1),
      vehicle_tax: Joi.number().min(0),
      fixed_commission: Joi.number().min(0),
      subscription_charge: Joi.number().min(0),
      images: Joi.string(),
      is_active: Joi.number().integer().min(0).max(1),
      convenience_charge: Joi.number().min(0),
      waiting_charges_applicable: Joi.number().min(0),
      convenience_charge_waiver: Joi.number().min(0),
      convenience_venus_cut: Joi.number().min(0),
      min_driver_balance: Joi.number(),
      customer_notes_enabled: Joi.number().integer().min(0).max(1),
      reverse_bidding_enabled: Joi.number().integer().min(0).max(1),
      config: Joi.object(),
    }).or(
      'region_name',
      'display_order',
      'max_people',
      'destination_mandatory',
      'fare_mandatory',
      'vehicle_tax',
      'fixed_commission',
      'subscription_charge',
      'images',
      'is_active',
      'convenience_charge',
      'waiting_charges_applicable',
      'convenience_charge_waiver',
      'convenience_venus_cut',
      'min_driver_balance',
      'customer_notes_enabled',
      'reverse_bidding_enabled',
      'config',
    );

    var result = schema.validate(body);
    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var operatorId = req.operator_id;
    var regionId = body.region_id;
    var regionName = body.region_name;
    var displayOrder = body.display_order;
    var maxPeople = body.max_people;
    var destinationMandatory = body.destination_mandatory;
    var fareMandatory = body.fare_mandatory;
    var vehicleTax = body.vehicle_tax;
    var fixedCommission = body.fixed_commission;
    var subscriptionCharge = body.subscription_charge;
    var images = body.images;
    var isActive = body.is_active;
    var convenienceCharge = body.convenience_charge;
    var waitingChargesApplicable = body.waiting_charges_applicable;
    var convenienceChargeWaiver = body.convenience_charge_waiver;
    var convenienceVenusCut = body.convenience_venus_cut;
    var minDriverBalance = body.min_driver_balance;
    var customerNotesEnabled = body.customer_notes_enabled;
    var reverseBiddingEnabled = body.reverse_bidding_enabled;

    var params = {};
    var valuesToUpdate = {
      region_name: regionName,
      display_order: displayOrder,
      max_people: maxPeople,
      destination_mandatory: destinationMandatory,
      fare_mandatory: fareMandatory,
      vehicle_tax: vehicleTax,
      fixed_commission: fixedCommission,
      subscription_charge: subscriptionCharge,
      is_active: isActive,
      images: images,
      convenience_charge: convenienceCharge,
      waiting_charges_applicable: waitingChargesApplicable,
      convenience_charge_waiver: convenienceChargeWaiver,
      convenience_venus_cut: convenienceVenusCut,
      min_driver_balance: minDriverBalance,
      customer_notes_enabled: customerNotesEnabled,
      reverse_bidding_enabled: reverseBiddingEnabled,
    };

    if (body.config) {
      valuesToUpdate.config = JSON.stringify(body.config);
    }

    for (var key in valuesToUpdate) {
      if (valuesToUpdate[key] || valuesToUpdate[key] === 0) {
        params[key] = valuesToUpdate[key];
      }
    }

    var updateCriteria = [
      { key: 'region_id', value: regionId },
      { key: 'operator_id', value: operatorId },
    ];

    await db.updateTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
      params,
      updateCriteria,
    );
    return responseHandler.success(
      req,
      res,
      'Vehicle edited successfully.',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchVehicleSet = async function (req, res) {
  try {
    var query = req.query;
    delete query.token;
    delete query.operator_id;

    var schema = Joi.object({
      primary_region_id: Joi.number().required(),
      city_id: Joi.number().required(),
      secret_key: Joi.number().optional(),
    });
    var result = schema.validate(query);
    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var operatorId = req.operator_id;
    var cityId = query.city_id;
    var primaryRegionId = query.primary_region_id;
    var details = {};
    var cityDetails = {};
    var response = {};

    var requiredKeys = ['vehicle_set_config', 'enable_vehicle_sets', 'city_id'];
    var criteriaKeys = [
      { key: 'operator_id', value: operatorId },
      { key: 'city_id', value: cityId },
    ];
    cityDetails = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY}`,
      requiredKeys,
      criteriaKeys,
    );

    if (!cityDetails.length || !cityDetails[0].enable_vehicle_sets) {
      return responseHandler.returnErrorMessage(
        res,
        `Unable to fetch vehicle set details`,
      );
    }

    var criteriaKeys = [
      { key: 'region_id', value: primaryRegionId },
      { key: 'operator_id', value: operatorId },
      { key: 'is_active', value: 1 },
      { key: 'city_id', value: cityId },
    ];

    // Handle `ride_type` explicitly
    if (
      Array.isArray(rideConstants.ALLOWED_RIDE_TYPES_FOR_VEHICLE_SET) &&
      rideConstants.ALLOWED_RIDE_TYPES_FOR_VEHICLE_SET.length > 0
    ) {
      criteriaKeys.push({
        key: 'ride_type',
        value: rideConstants.ALLOWED_RIDE_TYPES_FOR_VEHICLE_SET,
        isArray: true, // Custom property to indicate array handling
      });
    }
    var requiredKeys = ['region_id', 'city_id', 'operator_id'];
    details = await db.SelectFromTableIn(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
      requiredKeys,
      criteriaKeys,
    );

    if (!details.length) {
      throw new Error('Primary region id is invalid');
    }

    var stmt = `SELECT vs.region_id, vs.set_id FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_SETS} vs JOIN ${dbConstants.LIVE_DB.CITY_REGIONS}  cr ON vs.region_id =
        cr.region_id WHERE cr.is_active = ? AND vs.set_id IN (SELECT set_id FROM ${dbConstants.LIVE_DB.VEHICLE_SETS} WHERE
        region_id = ? AND is_primary = ? AND is_active = ?) AND vs.is_active = ? AND vs.is_primary = ?`;

    var values = [1, primaryRegionId, 1, 1, 1, 0];

    details = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, values);

    var vehicleSets = details.map(function (value) {
      return value.region_id;
    });

    return responseHandler.success(req, res, '', vehicleSets);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchOperatorRequestRadius = async function (req, res) {
  try {
    var operatorId = parseInt(req.operator_id);
    var city = parseInt(req.body.city_id) || 0;
    var vehicleType = parseInt(req.body.vehicle_type);
    var RIDE_TYPE = parseInt(req.body.ride_type);

    var values = [city, operatorId, vehicleType, RIDE_TYPE];

    var queryToFetchOperatorVehicleType = `SELECT region_id, IFNULL(request_radius, 4000) as request_radius FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} WHERE city_id = ? AND operator_id = ? AND vehicle_type = ? AND ride_type = ? LIMIT 1`;

    var result = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queryToFetchOperatorVehicleType,
      values,
    );

    return responseHandler.success(req, res, 'success!', result);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateOperatorRequestRadius = async function (req, res) {
  try {
    var body = req.body;
    var checkValues = checkBlank([body.region_id, body.request_radius]);
    var operatorId = req.operator_id;
    if (checkValues === 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    var insertionSet = {
      request_radius: body.request_radius,
    };
    var queryToUpdateTable = `UPDATE tb_city_sub_regions SET request_radius = ? WHERE region_id =? AND operator_id = ?`;
    // Logging for debugging
    console.log('Query:', queryToUpdateTable);
    console.log('Params:', [insertionSet, body.region_id, operatorId]);
    await db.RunQuery(dbConstants.DBS.LIVE_DB, queryToUpdateTable, [
      body.request_radius,
      body.region_id,
      operatorId,
    ]);

    return responseHandler.success(
      req,
      res,
      'Vehicle type changes updated!',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchVehicleImagesNfares = async function (req, res) {
  try {
    var body = req.body,
      response = {};
    var operatorId = req.operator_id;
    body.operatorId = req.operator_id;

    var checkValues = checkBlank([
      body.city_id,
      operatorId,
      body.vehicle_type,
      body.ride_type,
    ]);
    if (checkValues === 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    if (body.city_id <= 0 || body.vehicle_type < 1) {
      throw new Error(
        'A required URL parameter or required request body JSON property is missing.',
      );
    }

    var data = await Helper.fetchVehiclesImagesFaresData(req.body, operatorId);
    const fetchQuery = `
    SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATOR_PARAMS} 
    WHERE param_id = ? AND operator_id = ?
`;

    let is_schedule_fare_enabled = 0

    let existingParam = await db.RunQuery(dbConstants.DBS.LIVE_DB, fetchQuery, [495, operatorId]);

    if (existingParam && existingParam.length > 0) {
      is_schedule_fare_enabled = existingParam[0].param_value || 0
    }

    // data.fares.is_schedule_fare_enabled = is_schedule_fare_enabled

    response = {
      fares: data.fares,
      images: data.images,
      defaultImages: data.defaultImages,
      is_schedule_fare_enabled: is_schedule_fare_enabled
    };

    return responseHandler.success(req, res, 'success!', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.insertUpdatedFareLogs = async function (req, res) {
  try {
    var options = req.body,
      response = {},
      fareWrapper = [],
      package = {};
    var operatorId = req.operator_id;
    var businessId = 1;

    options.created_by = req.user_id;

    var fares = req.body.fares;
    var isScheduleFareEnabled = req.body.is_schedule_fare_enabled || 0

    fares = JSON.parse(fares);

    if (checkBlank(fares) === 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    var fareReqKeys = [
      'id AS fare_id',
      'fare_fixed',
      'fare_minimum',
      'fare_threshold_distance',
      'fare_per_km_after_threshold',
      'fare_per_km_threshold_distance',
      'fare_per_km_before_threshold',
      'fare_per_min',
      'fare_threshold_time',
      'fare_per_waiting_min',
      'fare_threshold_waiting_time',
      'city',
      'vehicle_type',
      'ride_type',
      'operator_id',
      'business_id',
      'type',
      'start_time',
      'end_time',
    ];

    for (var fare in fares) {
      var fareCriteria = {
        city: fares[fare].city,
        operator_id: operatorId,
        vehicle_type: fares[fare].vehicle_type,
        ride_type: fares[fare].ride_type,
        business_id: businessId,
        type: fares[fare].type,
      };

      if (fares[fare].type == rideConstants.LOGIN_TYPE.CUSTOMER) {
        fareCriteria.id = fares[fare].fare_id;
        var customerFareWrapper = {};
        await Helper.fetchFareData(fareCriteria, customerFareWrapper);
        fareWrapper.push(customerFareWrapper.data[0]);
      } else if (fares[fare].type == rideConstants.LOGIN_TYPE.DRIVER) {
        fareCriteria.id = fares[fare].fare_id;
        var driverFareWrapper = {};
        await Helper.fetchFareData(fareCriteria, driverFareWrapper);
        fareWrapper.push(driverFareWrapper.data[0]);
      }

      if (
        fares[fare].type == rideConstants.LOGIN_TYPE.CUSTOMER ||
        fares[fare].type == rideConstants.LOGIN_TYPE.DRIVER
      ) {
        // var updateFareTableInternalPromisfied = Promise.promisify(updateFareTableInternal);

        //  await updateFareTableInternalPromisfied(  fares[fare], fares[fare].fare_id);

        var params = fares[fare];
        var fareId = fares[fare].fare_id;

        var updateObj = {
          fare_fixed: params.fare_fixed,
          fare_minimum: params.fare_minimum,
          fare_threshold_distance: params.fare_threshold_distance,
          fare_per_km_threshold_distance: params.fare_per_km_threshold_distance,
          fare_per_km_after_threshold: params.fare_per_km_after_threshold,
          fare_per_km_before_threshold: params.fare_per_km_before_threshold,
          fare_per_min: params.fare_per_min,
          fare_threshold_time: params.fare_threshold_time,
          fare_per_waiting_min: params.fare_per_waiting_min,
          fare_threshold_waiting_time: params.fare_threshold_waiting_time,
          accept_subsidy_before_threshold:
            params.accept_subsidy_before_threshold,
          accept_subsidy_after_threshold: params.accept_subsidy_after_threshold,
          accept_subsidy_threshold_distance:
            params.accept_subsidy_threshold_distance,
          cancellation_charges: params.cancellation_charges,
          tax_percentage: params.tax_percentage,
          scheduled_ride_fare: params.scheduled_ride_fare,
          cancellation_charges_after_driver_arrival:
            params.cancellation_charges_after_driver_arrival,
          driver_wait_time_after_arrival: params.driver_wait_time_after_arrival,
          cancel_threshold_time: params.cancel_threshold_time,
          cancel_threshold_distance: params.cancel_threshold_distance,
          fare_per_baggage: params.fare_per_baggage,
          fare_per_xmin: params.fare_per_xmin,
          no_of_xmin: params.no_of_xmin,
          rental_fare_factor: params.rental_fare_factor,
          rental_fixed_fare: params.rental_fixed_fare,
          scheduled_ride_fare: params.scheduled_ride_fare
        };
        // Replace `undefined` with `null`
        Object.keys(updateObj).forEach((key) => {
          if (updateObj[key] === undefined) {
            updateObj[key] = null;
          }
        });
        // Build the SET clause dynamically
        const setClause = Object.keys(updateObj)
          .map((key) => `${key} = ?`)
          .join(', ');

        const fetchQuery = `
          SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATOR_PARAMS} 
          WHERE param_id = ? AND operator_id = ?
      `;

        let existingParam = await db.RunQuery(dbConstants.DBS.LIVE_DB, fetchQuery, [495, operatorId]);

        if (existingParam && existingParam.length > 0) {
          const updateQuery = `
              UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATOR_PARAMS} 
              SET param_value = ? 
              WHERE id = ?
          `;
          await db.RunQuery(dbConstants.DBS.LIVE_DB, updateQuery, [isScheduleFareEnabled, existingParam[0].id]);
        } else {
          const insertQuery = `
              INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.OPERATOR_PARAMS} (param_id, operator_id, param_value)
              VALUES (?, ?, ?)
          `;
          await db.RunQuery(dbConstants.DBS.LIVE_DB, insertQuery, [495, operatorId, isScheduleFareEnabled]);
        }
        var sqlQuery = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_FARE} SET ${setClause} WHERE id = ? `;
        var values = [...Object.values(updateObj), fareId];
        await db.RunQuery(dbConstants.DBS.LIVE_DB, sqlQuery, values);
      }
    }

    if (fares.customer.ride_type == rideConstants.RIDE_TYPE.OUTSTATION) {
      var cityList = await checkIfOperatorCityExists(
        [fares.from_city_id, fares.to_city_id],
        operatorId,
      );
      if (cityList.length < 2) {
        return responseHandler.returnErrorMessage(
          res,
          `Sorry! You are not active in these cities.`,
        );
      }

      package = {
        package_name: fares.package_name,
        from_city_id: fares.from_city_id,
        to_city_id: fares.to_city_id,
        return_trip: fares.return_trip,
      };
      var updateCondition = [{ key: 'id', value: fares.package_id }];
      await db.updateTable(
        dbConstants.DBS.LIVE_DB,
        `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_RENTAL}`,
        package,
        updateCondition,
      );
    } else if (fares.customer.ride_type == rideConstants.RIDE_TYPE.RENTAL) {
      package = {
        package_name: fares.package_name,
      };

      var updateCondition = [{ key: 'id', value: fares.package_id }];

      await db.updateTable(
        dbConstants.DBS.LIVE_DB,
        `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_RENTAL}`,
        package,
        updateCondition,
      );
    }

    var data = {
      city_id: fares.customer.city,
      vehicle_type: fares.customer.vehicle_type,
      ride_type: fares.customer.ride_type,
      token: req.body.token,
    };

    var fetchVehicleImageAndFares = await Helper.fetchVehiclesImagesFaresData(
      data,
      operatorId,
    );
    return responseHandler.success(
      req,
      res,
      'Success',
      fetchVehicleImageAndFares,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

async function checkIfOperatorCityExists(cities, operatorId) {
  var cityQuery = `
            SELECT
                *
            FROM
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY}
            WHERE
                is_active = 1 AND
                city_id in (?) AND
                operator_id = ?
        `;

  var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, cityQuery, [
    cities,
    operatorId,
  ]);
  return result;
}

async function fetchImageTypeDocument(operatorId, vehicleType) {
  var stmt = `SELECT
                rd.document_id
            FROM 
             ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd
            JOIN 
                ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd ON cd.document_id = rd.document_id
            WHERE 
                rd.operator_id = ? 
                AND cd.city_id = ?
                AND cd.vehicle_type = ? 
                AND cd.is_active = ?
                AND cd.is_required = ?
                AND rd.document_type = ?`;
  var values = [
    operatorId,
    rideConstants.CITIES.DEFAULT_CITY_ID,
    vehicleType,
    rideConstants.STATUS.ACTIVE,
    rideConstants.DRIVER_DOCUMENTS_IS_REQUIRED.MANDATORY_REGISTER,
    rideConstants.DOCUMENT_TYPES.IMAGE,
  ];

  var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, values);
  return result;
}

exports.fetchAvailableVehicles = async function (req, res) {
  try {
    var response = {},
      cityId = req.query.city_id,
      operatorId = req.operator_id,
      vehicleValues = {},
      filteredVehicleTypes = [],
      mandatoryFields = [cityId, operatorId];

    var requestRideType = req.request_ride_type;

    let all_vehicle_types = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ];

    if (checkBlank(mandatoryFields)) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var requiredVehicleKeys = ['vehicle_type'];
    var vehicleCriteria = [
      { key: 'operator_id', value: operatorId },
      { key: 'city_id', value: cityId },
    ];

    if (requestRideType == rideConstants.CLIENTS.MARS) {
      vehicleCriteria.push({
        key: 'ride_type',
        value: rideConstants.CLIENTS_RIDE_TYPE.MARS,
      });
    } else {
      vehicleCriteria.push({
        key: 'ride_type',
        value: rideConstants.CLIENTS_RIDE_TYPE.VENUS_TAXI,
      });
    }

    vehicleValues = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
      requiredVehicleKeys,
      vehicleCriteria,
    );
    const vehicleTypes = vehicleValues.map((vehicle) => vehicle.vehicle_type);
    filteredVehicleTypes = all_vehicle_types.filter(
      (type) => !vehicleTypes.includes(type),
    );

    response = {
      occupied_vehicle_types: vehicleTypes,
      available_vehicle_types: filteredVehicleTypes,
    };

    return responseHandler.success(req, res, 'Vehicle list fetched.', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.fetchRadiusOrEta = async function (req, res) {
  try {
    var cityId = req.body.city_id,
      mandatoryFields = [cityId];

    if (checkBlank(mandatoryFields)) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var queryToFetchRadiusOrETA = `SELECT id, city_id, is_active, request_radius FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.REQUEST_RADIUS} WHERE city_id = ${req.body.city_id} `

    var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, queryToFetchRadiusOrETA, []);
    return responseHandler.success(req, res, 'Radius list fetched.', result);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateTbRequestRadius = async function (req, res) {
  try {
    var cityId = req.body.city_id,
      requestRadius = req.body.request_radius,
      id = req.body.id,
      mandatoryFields = [cityId, requestRadius, id];


    if (checkBlank(mandatoryFields)) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    var radiusInKm = (requestRadius / 1000);
    let radiusLat = parseFloat((radiusInKm / 111.32).toFixed(3));
    let radiusLong = parseFloat((radiusInKm / 111.32).toFixed(3));
    let latitudeConstraint = radiusLat
    let longitudeConstraint = radiusLong

    var queryToUpdate = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.REQUEST_RADIUS} SET latitude_constraint = ? , longitude_constraint = ? , request_radius = ? WHERE id = ? `

    await db.RunQuery(dbConstants.DBS.LIVE_DB, queryToUpdate, [latitudeConstraint, longitudeConstraint, requestRadius, id]);
    return responseHandler.success(req, res, 'Radius Updated SuccussFully.', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

exports.updateVehicleImagesNfares = async function (req, res) {
  try {
    var body = req.body;
    delete body['token'];
    delete body['$$hashKey'];
    delete body['operator_id'];

    var schema = Joi.object({
      region_id: Joi.number().integer().positive().required(),
      images: Joi.string().required(),
    })

    var result = schema.validate(body);
    if (result.error) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var operatorId = req.operator_id;

    var params = {};
    var valuesToUpdate = {
      images: images,
    };

    for (var key in valuesToUpdate) {
      if (valuesToUpdate[key] || valuesToUpdate[key] === 0) {
        params[key] = valuesToUpdate[key];
      }
    }

    var updateCriteria = [
      { key: 'region_id', value: regionId },
      { key: 'operator_id', value: operatorId },
    ];

    await db.updateTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS}`,
      params,
      updateCriteria,
    );
    return responseHandler.success(
      req,
      res,
      'Vehicle edited successfully.',
      '',
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};