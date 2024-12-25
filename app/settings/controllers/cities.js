const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
    generalConstants,
  } = require('../../../bootstart/header');
  var moment = require('moment');
  var Joi = require('joi');
  const Helper = require('../helper');
  const rideConstant = require('../../../constants/rideConstants');
  
  exports.fetchOprCitiesFields = async function (req, res) {
    try {
        delete req.body.token;

        var schema = Joi.object({
            cp_operator_id: Joi.number().required(),
            operator_id: Joi.number().valid(-1).required(),
            city_id: Joi.number().integer().min(1).required(),
            secret_key: Joi.number().optional(),
            super_admin_panel: Joi.number().valid(1).optional()
        });
        var result = schema.validate(req.body);

        if (result.error) {
            return responseHandler.parameterMissingResponse(res);
        }

        var autosRequiredFields = [];
        var authRequiredFields = [];
        var superAdminPanel = req.body.super_admin_panel;

        if (superAdminPanel) {
            autosRequiredFields = editableOprCityFieldsAutosSuperAdmin;
            //fetch only the fields which are not retrieved from autos
            authRequiredFields = editableOprCityFieldsAuthSuperAdmin.filter((field) => !~autosRequiredFields.indexOf(field));
        }
        else {
            autosRequiredFields = editableOprCityFieldsAutos;

            //fetch only the fields which are not retrieved from autos
            authRequiredFields = editableOprCityFieldsAuth.filter((field) => !~autosRequiredFields.indexOf(field));
        }

        var response = {};
        var metaData = {};
        var countries = [];
        var autosValues = {};
        var authValues = {};
        var operatorId = req.body.cp_operator_id;
        var cityId = req.body.city_id;
        var criteria = [{key : "city_id", value : cityId}, {key : "operator_id", value : operatorId}];
        var operatorParamWrapper = {};


        await Helper.fetchParameterValues(operatorId,operatorParamWrapper,'vehicle_model_enabled', [])
        if(autosRequiredFields.length){
            if (parseInt(operatorParamWrapper.vehicle_model_enabled)) {
                autosRequiredFields.push('vehicle_model_enabled');
            }

            autosValues = await db.SelectFromTable(
                dbConstants.DBS.LIVE_DB,
                `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY}`,
                autosRequiredFields,
                criteria
              );
            authValues = autosValues[0]
        }
        if(authRequiredFields.length){
            authValues = await db.SelectFromTable(
                dbConstants.DBS.AUTH_DB,
                `${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.O_CITY}`,
                authRequiredFields,
                criteria
              );
            authValues = authValues[0];
        }
        var operatorCityFieldValues = Object.assign({}, autosValues, authValues);
        await Helper.formatOperatorCityFields(operatorCityFieldValues, metaData);
        var requiredKeys = ['coun_id','name','slug'];
        var criteriaKeys = [{key: 'status', value: 1}];
        countries = await db.SelectFromTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.COUNTRY}`,
            requiredKeys,
            criteriaKeys
          );

          response = {
            data : operatorCityFieldValues,
            meta_data : metaData,
            countries : countries
        };

      return responseHandler.success(
        req,
        res,
        '',
        response.data,
      );
    } catch (error) {
        console.log(error);
        
      errorHandler.errorHandler(error, req, res);
    }
  };

  exports.updateTbOperatorCities = async function (req, res) {
      try {
          delete req.body.token;
          if (typeof req.body.office_address != "undefined") {
              delete req.body.office_address;
          }
          var schema = Joi.object({
              cp_operator_id: Joi.number().required(),
              operator_id: Joi.number().valid(-1).required(),
              city_id: Joi.number().integer().min(1).required(),
              secret_key: Joi.number().optional()
          });

          var result = schema.validate({ cp_operator_id: req.body.cp_operator_id, operator_id: req.body.operator_id, city_id: req.body.city_id });

          if (result.error) {
              return responseHandler.parameterMissingResponse(res);
          }

          var response;

          var body = req.body;
          var cityId = body.city_id;
          var operatorId = body.cp_operator_id;
          var updateCriteria = [{ key: "operator_id", value: operatorId }, { key: "city_id", value: cityId }];
          var superAdminPanel = body.super_admin_panel;
          var field;
          var authUpdateParams = {};
          var autosUpdateParams = {};
          if (body.social_links) {
              body.social_links = JSON.stringify(
                  {
                      "facebook_url": body.social_links.facebook_url,
                      "legal_url": body.social_links.legal_url,
                      "who_we_are": body.social_links.who_we_are,
                      "privacy_policy": body.social_links.privacy_policy,
                      "support_email": body.social_links.support_email
                  }
              )
          }

          var commonUpdateParams = {};
          var exclusiveAuthFields = [];
          var exclusiveAutosFields = [];
          var commonFields = [];

          var commonFields = [];
          //Additional verification and formatting
          for (var key in body) {
              switch (key) {
                //   case "driver_side_menu":
                //       body[key] = yield verifyDriverSideMenuArray(handlerInfo, body[key]);
                //       break;

                  case "referral_data":
                      body[key] = verifyReferralData(body[key]);
                      break;

                //   case "office_address":
                //       body[key] = verifyOfficeAddress(body[key]);
                //       break;

                  default:
                      break;
              }
          }

          if (superAdminPanel) {
              exclusiveAuthFields = editableOprCityFieldsAuthSuperAdmin;
              exclusiveAutosFields = editableOprCityFieldsAutosSuperAdmin;
          }
          else {
              exclusiveAuthFields = editableOprCityFieldsAuth;
              exclusiveAutosFields = editableOprCityFieldsAutos;
          }

          //Building update params for auth
          for (field of exclusiveAuthFields) {
              if (field in body) {
                  authUpdateParams[field] = body[field];
              }
          }
          //Building update params for autos
          for (field of exclusiveAutosFields) {
              if (field in body) {
                  autosUpdateParams[field] = body[field];
              }
          }
          //Building common update params
          for (field of commonFields) {
              if (field in body) {
                  commonUpdateParams[field] = body[field];
              }
          }

          //update auth table
          if (!isEmptyObject(authUpdateParams)) {
              await db.updateTable(
                  dbConstants.DBS.LIVE_DB,
                  `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY}`,
                  authUpdateParams,
                  updateCriteria
              );
          }

          //update autos table
          if (!isEmptyObject(autosUpdateParams)) {
              await db.updateTable(
                  dbConstants.DBS.LIVE_DB,
                  `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY}`,
                  autosUpdateParams,
                  updateCriteria
              );
          }

      return responseHandler.success(
        req,
        res,
        'Successfully updated',
        ''
      );
    } catch (error) {
      errorHandler.errorHandler(error, req, res);
    }
  };


  exports.addVehicleMake = async function (req, res) {
    try {
        var options = req.body;
        var response = {};
        
        delete req.body.token;
        delete req.body.operator_id;
    
        var schema = Joi.object({
            city_id : Joi.number().required(),
            vehicle_make_data : Joi.array().items(Joi.object().keys(
            {
                brand : Joi.string().required(),
                model_name : Joi.string().required(),
                vehicle_type : Joi.number().required(),
                no_of_seat_belts : Joi.number().required(),
                no_of_doors : Joi.number().required(),
            }))
        });

        var result = schema.validate(options);
        if (result.error) {
            return responseHandler.parameterMissingResponse(res);
        };
        options.password = generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD;

        if (req.file) {
            var docImage = req.file;
            var wrapperObject = {};
            var awsCredentials = {
                ridesDataBucket: process.env.AWS_RIDES_DATA_BUCKET,
                driverDocumentsBucket: process.env.AWS_DRIVER_DOCUMENTS_BUCKET,
                operatorDataBucket: process.env.AWS_OPERATOR_DATA_BUCKET,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                region: process.env.AWS_REGION
            }
            try {
                var filename = Date.now() + "." + docImage.originalname.split(".").pop();
            } catch (e) {
                var filename = Date.now();
            }

            await Helper.readImageFile(docImage, wrapperObject);

            await Helper.uploadFileToS3(awsCredentials, filename, wrapperObject);

            options.vehicle_make_data[0].image = wrapperObject && wrapperObject.url ? wrapperObject.url : '';
        }
        if(options.vehicle_make_data.length && !req.file) {      
            for(var vehicleMake of options.vehicle_make_data) {
                vehicleMake.image = '';
            }
        }
        options.operator_id = req.operator_id;
        var operatorId = options.operator_id;
        var cityId = options.city_id;
        var vehicleMakeData = options.vehicle_make_data;
        
        var output = vehicleMakeData.map(obj => {
            obj.operator_id = operatorId;
            obj.city_id = cityId;
            return Object.keys(obj).sort().map(key => {
                return obj[key];
            });
        });
        var batchSize = 100;
        var vehicleDetails;
        for (var index = 0; index < output.length; index += batchSize) {
            vehicleDetails = output.slice(index, index + batchSize);
            // Dynamically construct placeholders
            var placeholders = vehicleDetails.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            var query = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_MAKE} (brand, city_id, image, model_name, no_of_doors, no_of_seat_belts, operator_id, vehicle_type) VALUES ${placeholders}`

            var flattenedParams = vehicleDetails.flat();

            var result = await db.RunQuery(
                dbConstants.DBS.LIVE_DB,
                query,
                flattenedParams,
            );
        }
        return responseHandler.success(
            req,
            res,
            'Data Inserted Successfully',
            ''
        );
    } catch (error) {
        console.log(error);
        
        errorHandler.errorHandler(error, req, res);
    }
};


exports.updateVehicleMake = async function (req, res) {
    try {
        var options = req.body;
        var response = {};

        delete req.body.token;
        delete req.body.operator_id;

        var schema = Joi.object({
            city_id: Joi.number().required(),
            brand: Joi.string().required(),
            model_name: Joi.string().required(),
            vehicle_type: Joi.number().required(),
            no_of_seat_belts: Joi.number().required(),
            no_of_doors: Joi.number().required(),
            id: Joi.number().required(),
            is_active: Joi.number().required(),
            secret_key: Joi.number().optional()
        });

        var result = schema.validate(options);
        if (result.error) {
            return responseHandler.parameterMissingResponse(res);
        };
        options.password = generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD;

        if (req.file) {
            var docImage = req.file;
            var wrapperObject = {};
            var awsCredentials = {
                ridesDataBucket: process.env.AWS_RIDES_DATA_BUCKET,
                driverDocumentsBucket: process.env.AWS_DRIVER_DOCUMENTS_BUCKET,
                operatorDataBucket: process.env.AWS_OPERATOR_DATA_BUCKET,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                region: process.env.AWS_REGION
            }
            try {
                var filename = Date.now() + "." + docImage.originalname.split(".").pop();
            } catch (e) {
                var filename = Date.now();
            }

            await Helper.readImageFile(docImage, wrapperObject);

            await Helper.uploadFileToS3(awsCredentials, filename, wrapperObject);

            options.image = wrapperObject && wrapperObject.url ? wrapperObject.url : '';
        }
        var updateCriteria = [{ key: 'id', value: req.body.id }];

        var vehicleMake = {
            city_id: options.city_id,
            brand: options.brand,
            model_name: options.model_name,
            vehicle_type: options.vehicle_type,
            no_of_seat_belts: options.no_of_seat_belts,
            no_of_doors: options.no_of_doors,
            is_active: options.is_active
        };

        if (options.image) {
            vehicleMake.image = options.image;
        }
        await db.updateTable(
            dbConstants.DBS.LIVE_DB,
            `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_MAKE}`,
            vehicleMake,
            updateCriteria
        );
        return responseHandler.success(
            req,
            res,
            'Successfully updated',
            ''
        );
    } catch (error) {
        console.log(error);
        
        errorHandler.errorHandler(error, req, res);
    }
};


function isEmptyObject(obj) {
    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
        //empty object
        return 1;
    }
    return 0;
}

function verifyReferralData(referralDataObj){
    if(!referralDataObj){
        return null;
    }
    var allowedReferralFields = panelConstants.referralData;

    for(var key in referralDataObj){
        if(!allowedReferralFields[key]){
            delete referralDataObj[key];
            continue;
        }
    }
    if(isEmptyObject(referralDataObj)){
        return null;
    }
    return JSON.stringify(referralDataObj);
}

const editableOprCityFieldsAutosSuperAdmin = ['office_address', 'emergency_no', 'show_region_specific_fare', 'driver_support_number',
    'customer_support_number', 'chat_enabled', 'advertise_credits', 'social_links', 'mandatory_fare_capping_threshold',
    'end_ride_deduct_commission', 'check_driver_debt', 'is_gender_enabled', 'countrywise_cities', 'county_id', 'is_driver_preference_enabled',
    'is_enable_driver_multi_cancel_action', 'number_of_cancellations_allowed', 'hours_for_allowed_cancellation', 'block_time_for_multi_cancel', 'package_delivery_restriction_enabled', 'maximum_distance'];

const editableOprCityFieldsAutos = ['start_operation_time', 'end_operation_time', 'driver_side_menu', 'chat_enabled',
    'emergency_no', 'eta_multiplication_factor', 'operational_hours_enabled',
    'show_region_specific_fare', 'enable_address_localisation', 'vehicle_services_enabled', 'social_links', 'is_gender_enabled', 'countrywise_cities', 'county_id', 'is_driver_preference_enabled', 'package_delivery_restriction_enabled', 'maximum_distance'];

const editableOprCityFieldsAuth = ['referral_data'];

const editableOprCityFieldsAuthSuperAdmin   = [];