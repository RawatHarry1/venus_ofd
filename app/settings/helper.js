const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    ResponseConstants,
    rideConstants,
    generalConstants,
  } = require('../../bootstart/header');

  var fs 			    = require('fs').promises;
var AWS                  = require('aws-sdk');
const path = require('path');


exports.fetchParameterValues = async function fetchParameterValues (operatorId, resultWrapper, paramList, paramIds, serverType) {
    var fetchParamQuery =
        `SELECT 
            pr.param_id,
            pr.param_name, 
            COALESCE(opr.param_value, pr.param_value) AS param_value,
            pr.param_value AS default_value, 
            opr.param_value AS operator_value,
            pr.min_value as min_value,
            pr.max_value as max_value,
            pr.label as label, 
            pr.allowed_values as allowed_values,
            pr.type as type 
         FROM tb_parameters pr 
         LEFT JOIN tb_operator_params opr 
            ON  pr.param_id = opr.param_id AND 
                opr.operator_id = ?  `;

    var values = [operatorId];
    if(paramList.length) {
        fetchParamQuery += ` WHERE pr.param_name IN (?) `;
        values.push(paramList);
    }
    else if(paramIds.length) {
        fetchParamQuery += ` WHERE pr.param_id IN (?) `;
        values.push(paramIds);
    }
    if(serverType == rideConstants.serverFlag.AUTH){
        var result = await db.RunQuery(
            dbConstants.DBS.AUTH_DB,
            fetchParamQuery,
            values,
          );
    }else{
        var result = await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            fetchParamQuery,
            values,
          );
    }
    if(result.length){
        for(var param of result) {
            resultWrapper[param.param_name] = param.param_value;
        }
    }
    return result
}

exports.formatOperatorCityFields = async function (operatorCityFields, metaData) {
    try {
        if (operatorCityFields["driver_side_menu"]) {
            operatorCityFields["driver_side_menu"] = menuStringToArray(operatorCityFields["driver_side_menu"]);
        }

        // const appSideMenus = await fetchAppSideMenuAutos();
        // metaData["all_driver_side_menus"] = appSideMenus["driver_side_menu"];

        if (operatorCityFields["referral_data"]) {
            operatorCityFields["referral_data"] = parseJsonString(operatorCityFields["referral_data"], "Parsing referral data.");
        }

        if (operatorCityFields["office_address"]) {
            operatorCityFields["office_address"] = parseJsonString( operatorCityFields["office_address"], "Parsing office address");
        }

        if (operatorCityFields["social_links"]) {
            operatorCityFields["social_links"] = parseJsonString(operatorCityFields["social_links"], "Parsing social_links");
        }
    } catch (error) {
        metaData["all_driver_side_menus"] = null;
    }
}

// exports.fetchAppSideMenuAutos = async function () {
//     let data
//     data.password = generalConstants.OPERATIONS_PASSWORD;
//     if(!data.password){
//         return responseHandler.parameterMissingResponse(res, 'password');
//     }

//     var customerSideMenu = JSON.parse(JSON.stringify(gConstants.customerAppMenuTags[0]));
//     var driverSideMenu = JSON.parse(JSON.stringify(gConstants.driverSideMenuMap));

//     var sideMenus = {
//         customer_side_menu: customerSideMenu,
//         driver_side_menu: driverSideMenu,
//     };

//     return sideMenus
// }

function menuStringToArray(menuString){
    if(!menuString || menuString.length == 0){
        return [];
    }
    return menuString.split(",");
}

function parseJsonString(jsonString, event){
    var parsedJson;
    try{
        parsedJson = JSON.parse(jsonString);
    }catch(error){
        logging.error(handlerInfo, {EVENT : event}, {ERROR : "Invalid JSON String encountered."})
    }

    if(!parsedJson){
        return {};
    }
    return parsedJson;
}


exports.readImageFile = async function (imageFile,wrapperObject) {
    try {
        const normalizedPath = path.normalize(imageFile.path);
        const data = await fs.readFile(normalizedPath);
        wrapperObject.image = data;
    } catch (err) {
        throw new Error(`Error reading image file: ${err.message}`);
    }
}


exports.uploadFileToS3 = async function (awsCredentials,filename, wrapperObject) {
    const s3 = new AWS.S3({
        accessKeyId: awsCredentials.accessKeyId,
        secretAccessKey: awsCredentials.secretAccessKey,
        region: awsCredentials.region,
    });

    try {

        // Upload to S3
        const params = {
            ACL: 'public-read',
            Bucket: awsCredentials.ridesDataBucket,
            Key: filename,
            Body: wrapperObject.image,
        };

       let response =  await s3.upload(params).promise();
       wrapperObject.url = response.Location;
    } catch (error) {
        throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
}

async function fetchVehiclesImagesFaresData(body,operatorId) {
    try {
        let imageWrapper = {},
            customerFareWrapper = {},
            driverFareWrapper = {},
            defaultImageWrapper = {},
            operatorParamWrapper = {};

        const imageReqKeys = ['images'];

        const imageCriteria = [
            { key: 'city_id', value: parseInt(body.city_id) },
            { key: 'operator_id', value: operatorId },
            { key: 'vehicle_type', value: parseInt(body.vehicle_type) },
            { key: 'ride_type', value: parseInt(body.ride_type) },
            { key: 'is_active', value: 1 }
        ];

        const defaultImageCriteria = [
            { key: 'vehicle_type', value: parseInt(body.vehicle_type) }
        ];

        const customerFareCriteria = {
            city: parseInt(body.city_id),
            operator_id: operatorId,
            vehicle_type: parseInt(body.vehicle_type),
            ride_type: parseInt(body.ride_type),
            business_id: 1,
            type: rideConstants.fareType.CUSTOMER
        };

        const driverFareCriteria = {
            city: parseInt(body.city_id),
            operator_id: operatorId,
            vehicle_type: parseInt(body.vehicle_type),
            ride_type: parseInt(body.ride_type),
            business_id: 1,
            type: rideConstants.fareType.DRIVER
        };

        // Fetch data concurrently
        await Promise.all([
            (async () => {
                imageWrapper = await db.SelectFromTableIn(
                    dbConstants.DBS.LIVE_DB,
                    `${dbConstants.DBS.LIVE_DB}.tb_city_sub_regions`,
                    imageReqKeys,
                    imageCriteria
                );
            })(),
            (async () => {
                defaultImageWrapper = await db.SelectFromTableIn(
                    dbConstants.DBS.LIVE_DB,
                    `${dbConstants.DBS.LIVE_DB}.tb_vehicle_type`,
                    imageReqKeys,
                    defaultImageCriteria
                );
            })(),
            (async () => {
                await fetchFareData(customerFareCriteria,customerFareWrapper);
            })(),
            (async () => {
                await fetchFareData(driverFareCriteria,driverFareWrapper);
            })(),
            (async () => {
                 await fetchParameterValues(
                    operatorId,
                    {},
                    ['scheduled_ride_fare_enabled'],
                    [],
                    rideConstants.serverFlag.AUTOS
                );
            })()
        ]);

        // Prepare response
        const images = imageWrapper?.length ? imageWrapper[0].images : { message: 'no images found' };
        const defaultImages = defaultImageWrapper?.length ? defaultImageWrapper[0].images : { message: 'no images found' };

        const fares = [];
        if (!customerFareWrapper.data?.length) {
            fares.message = 'no customer fare found';
        } else if (!driverFareWrapper.data?.length) {
            fares.message = 'no driver fare found';
        } else {
            const isOutstationOrRental =
                body.ride_type === rideConstants.rideType.OUTSTATION ||
                body.ride_type === rideConstants.rideType.RENTAL;

            customerFareWrapper.data.forEach((customerFare) => {
                driverFareWrapper.data.forEach((driverFare) => {
                    if (
                        (isOutstationOrRental &&
                            customerFare.customer_fare_id === driverFare.customer_fare_id &&
                            customerFare.driver_fare_id === driverFare.driver_fare_id) ||
                        (!isOutstationOrRental &&
                            customerFare.start_time === driverFare.start_time &&
                            customerFare.end_time === driverFare.end_time)
                    ) {
                        const fareObj = {
                            customer: { ...customerFare },
                            driver: { ...driverFare },
                            package_name: customerFare.package_name,
                            package_id: customerFare.id,
                            from_city_id: customerFare.from_city_id,
                            to_city_id: customerFare.to_city_id,
                            return_trip: customerFare.return_trip,
                            start_time: customerFare.start_time,
                            end_time: customerFare.end_time
                        };

                        if (body.ride_type === rideConstants.rideType.RENTAL) {
                            delete fareObj.from_city_id;
                            delete fareObj.to_city_id;
                            delete fareObj.return_trip;
                        }

                        fares.push(fareObj);
                    }
                });
            });
        }

        return {
            fares,
            images,
            defaultImages
        };
    } catch (error) {
        throw error;
    }
};


async function fetchFareData(fareCriteria, resultWrapper) {
    try {
        let placeholder = '';
        let condition = '';
        let values = [fareCriteria.city, fareCriteria.operator_id, fareCriteria.vehicle_type, fareCriteria.ride_type];
        let select = '';

        // Conditional query for rental and outstation fares
        if ((fareCriteria.ride_type == rideConstants.rideType.RENTAL || fareCriteria.ride_type == rideConstants.rideType.OUTSTATION) && fareCriteria.type == 0) {
            placeholder += ` JOIN  ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_RENTAL} r ON f.id = r.customer_fare_id  `;
            select += ` ,IFNULL(r.package_name, "") AS package_name, r.id, r.customer_fare_id, r.driver_fare_id, r.from_city_id, r.to_city_id, r.return_trip `;
            condition += ` AND r.is_active = 1 `;
        } else if ((fareCriteria.ride_type == rideConstants.rideType.RENTAL || fareCriteria.ride_type == rideConstants.rideType.OUTSTATION) && fareCriteria.type == 1) {
            placeholder += ` JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_RENTAL} r ON f.id = r.driver_fare_id  `;
            select += ` ,IFNULL(r.package_name, "") AS package_name, r.id, r.customer_fare_id, r.driver_fare_id, r.from_city_id, r.to_city_id, r.return_trip `;
            condition += ` AND r.is_active = 1 `;
        }

        if (fareCriteria.id) {
            condition += ` AND f.id = ? `;
            values.push(fareCriteria.id);
        }

        if (fareCriteria.type == 0 || fareCriteria.type == 1) {
            condition += ` AND type = ? `;
            values.push(fareCriteria.type);
        }

        const fareData = `
            SELECT 
                f.*,
                f.id AS fare_id
                ${select}
            FROM 
                ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_FARE} f
                ${placeholder}
            WHERE
                city = ? AND
                operator_id = ? AND 
                vehicle_type = ? AND 
                ride_type = ? AND
                business_id = 1
                ${condition}
        `;

        var result = await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            fareData,
            values,
        );
        resultWrapper.data = result;

        // Return the result after successful query
        return resultWrapper.data;
    } catch (error) {
        // Handle any errors here
        console.error('Error in fetchFareData:', error.message);
        throw error; // You can throw an error here or handle it as needed
    }
}


async function fetchParameterValues(operatorId, resultWrapper, paramList, paramIds, serverType) {
    var fetchParamQuery =
        `SELECT 
            pr.param_id,
            pr.param_name, 
            COALESCE(opr.param_value, pr.param_value) AS param_value,
            pr.param_value AS default_value, 
            opr.param_value AS operator_value,
            pr.min_value as min_value,
            pr.max_value as max_value,
            pr.label as label, 
            pr.allowed_values as allowed_values,
            pr.type as type 
         FROM tb_parameters pr 
         LEFT JOIN tb_operator_params opr 
            ON  pr.param_id = opr.param_id AND 
                opr.operator_id = ?  `;

    var values = [operatorId];
    if (paramList.length) {
        fetchParamQuery += ` WHERE pr.param_name IN (?) `;
        values.push(paramList);
    }
    else if (paramIds.length) {
        fetchParamQuery += ` WHERE pr.param_id IN (?) `;
        values.push(paramIds);
    }
    if (serverType == rideConstants.serverFlag.AUTH) {
        var result = await db.RunQuery(
            dbConstants.DBS.AUTH_DB,
            fetchParamQuery,
            values,
        );
    } else {
        var result = await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            fetchParamQuery,
            values,
        );
    }
    if (result.length) {
        for (var param of result) {
            resultWrapper[param.param_name] = param.param_value;
        }
    }
    return result
}

module.exports = {fetchFareData,fetchVehiclesImagesFaresData}
