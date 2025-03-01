const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  generalConstants,
} = require('../../bootstart/header');

var fs = require('fs').promises;
var AWS = require('aws-sdk');
const path = require('path');

// exports.fetchParameterValues = async function fetchParameterValues (operatorId, resultWrapper, paramList, paramIds, serverType) {
//     var fetchParamQuery =
//         `SELECT
//             pr.param_id,
//             pr.param_name,
//             COALESCE(opr.param_value, pr.param_value) AS param_value,
//             pr.param_value AS default_value,
//             opr.param_value AS operator_value,
//             pr.min_value as min_value,
//             pr.max_value as max_value,
//             pr.label as label,
//             pr.allowed_values as allowed_values,
//             pr.type as type
//          FROM tb_parameters pr
//          LEFT JOIN tb_operator_params opr
//             ON  pr.param_id = opr.param_id AND
//                 opr.operator_id = ?  `;

//     var values = [operatorId];
//     if(paramList.length) {
//         fetchParamQuery += ` WHERE pr.param_name IN (?) `;
//         values.push(paramList);
//     }
//     else if(paramIds.length) {
//         fetchParamQuery += ` WHERE pr.param_id IN (?) `;
//         values.push(paramIds);
//     }
//     if(serverType == rideConstants.SERVER_FLAG.AUTH){
//         var result = await db.RunQuery(
//             dbConstants.DBS.AUTH_DB,
//             fetchParamQuery,
//             values,
//           );
//     }else{
//         var result = await db.RunQuery(
//             dbConstants.DBS.LIVE_DB,
//             fetchParamQuery,
//             values,
//           );
//     }
//     if(result.length){
//         for(var param of result) {
//             resultWrapper[param.param_name] = param.param_value;
//         }
//     }
//     return result
// }

async function formatOperatorCityFields(operatorCityFields, metaData) {
  try {
    if (operatorCityFields['driver_side_menu']) {
      operatorCityFields['driver_side_menu'] = menuStringToArray(
        operatorCityFields['driver_side_menu'],
      );
    }

    // const appSideMenus = await fetchAppSideMenuAutos();
    // metaData["all_driver_side_menus"] = appSideMenus["driver_side_menu"];

    if (operatorCityFields['referral_data']) {
      operatorCityFields['referral_data'] = parseJsonString(
        operatorCityFields['referral_data'],
        'Parsing referral data.',
      );
    }

    if (operatorCityFields['office_address']) {
      operatorCityFields['office_address'] = parseJsonString(
        operatorCityFields['office_address'],
        'Parsing office address',
      );
    }

    if (operatorCityFields['social_links']) {
      operatorCityFields['social_links'] = parseJsonString(
        operatorCityFields['social_links'],
        'Parsing social_links',
      );
    }
  } catch (error) {
    metaData['all_driver_side_menus'] = null;
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

function menuStringToArray(menuString) {
  if (!menuString || menuString.length == 0) {
    return [];
  }
  return menuString.split(',');
}

function parseJsonString(jsonString, event) {
  var parsedJson;
  try {
    parsedJson = JSON.parse(jsonString);
  } catch (error) {
    logging.error(
      handlerInfo,
      { EVENT: event },
      { ERROR: 'Invalid JSON String encountered.' },
    );
  }

  if (!parsedJson) {
    return {};
  }
  return parsedJson;
}

async function readImageFile(imageFile, wrapperObject) {
  try {
    const normalizedPath = path.normalize(imageFile.path);
    const data = await fs.readFile(normalizedPath);
    wrapperObject.image = data;
  } catch (err) {
    throw new Error(`Error reading image file: ${err.message}`);
  }
}

async function uploadFileToS3(awsCredentials, filename, wrapperObject) {
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

    let response = await s3.upload(params).promise();
    wrapperObject.url = response.Location;
  } catch (error) {
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

async function fetchVehiclesImagesFaresData(body, operatorId) {
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
      { key: 'is_active', value: 1 },
    ];

    const defaultImageCriteria = [
      { key: 'vehicle_type', value: parseInt(body.vehicle_type) },
    ];

    const customerFareCriteria = {
      city: parseInt(body.city_id),
      operator_id: operatorId,
      vehicle_type: parseInt(body.vehicle_type),
      ride_type: parseInt(body.ride_type),
      business_id: 1,
      type: rideConstants.FARE_TYPE.CUSTOMER,
    };

    const driverFareCriteria = {
      city: parseInt(body.city_id),
      operator_id: operatorId,
      vehicle_type: parseInt(body.vehicle_type),
      ride_type: parseInt(body.ride_type),
      business_id: 1,
      type: rideConstants.FARE_TYPE.DRIVER,
    };

    // Fetch data concurrently
    await Promise.all([
      (async () => {
        imageWrapper = await db.SelectFromTableIn(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.SUB_REGIONS}`,
          imageReqKeys,
          imageCriteria,
        );
      })(),
      (async () => {
        defaultImageWrapper = await db.SelectFromTableIn(
          dbConstants.DBS.LIVE_DB,
          `${dbConstants.DBS.LIVE_DB}.tb_vehicle_type`,
          imageReqKeys,
          defaultImageCriteria,
        );
      })(),
      (async () => {
        await fetchFareData(customerFareCriteria, customerFareWrapper);
      })(),
      (async () => {
        await fetchFareData(driverFareCriteria, driverFareWrapper);
      })(),
      (async () => {
        await fetchParameterValues(
          operatorId,
          {},
          ['scheduled_ride_fare_enabled'],
          [],
          rideConstants.SERVER_FLAG.AUTOS,
        );
      })(),
    ]);

    // Prepare response
    const images = imageWrapper?.length
      ? imageWrapper[0].images
      : { message: 'no images found' };
    const defaultImages = defaultImageWrapper?.length
      ? defaultImageWrapper[0].images
      : { message: 'no images found' };

    const fares = [];
    if (!customerFareWrapper.data?.length) {
      fares.message = 'no customer fare found';
    } else if (!driverFareWrapper.data?.length) {
      fares.message = 'no driver fare found';
    } else {
      const isOutstationOrRental =
        body.ride_type === rideConstants.RIDE_TYPE.OUTSTATION ||
        body.ride_type === rideConstants.RIDE_TYPE.RENTAL;

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
              end_time: customerFare.end_time,
            };

            if (body.ride_type === rideConstants.RIDE_TYPE.RENTAL) {
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
      defaultImages,
    };
  } catch (error) {
    throw error;
  }
}

async function fetchFareData(fareCriteria, resultWrapper) {
  try {
    let placeholder = '';
    let condition = '';
    let values = [
      fareCriteria.city,
      fareCriteria.operator_id,
      fareCriteria.vehicle_type,
      fareCriteria.ride_type,
    ];
    let select = '';

    // Conditional query for rental and outstation fares
    if (
      (fareCriteria.ride_type == rideConstants.RIDE_TYPE.RENTAL ||
        fareCriteria.ride_type == rideConstants.RIDE_TYPE.OUTSTATION) &&
      fareCriteria.type == 0
    ) {
      placeholder += ` JOIN  ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_RENTAL} r ON f.id = r.customer_fare_id  `;
      select += ` ,IFNULL(r.package_name, "") AS package_name, r.id, r.customer_fare_id, r.driver_fare_id, r.from_city_id, r.to_city_id, r.return_trip `;
      condition += ` AND r.is_active = 1 `;
    } else if (
      (fareCriteria.ride_type == rideConstants.RIDE_TYPE.RENTAL ||
        fareCriteria.ride_type == rideConstants.RIDE_TYPE.OUTSTATION) &&
      fareCriteria.type == 1
    ) {
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

    var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, fareData, values);
    resultWrapper.data = result;

    // Return the result after successful query
    return resultWrapper.data;
  } catch (error) {
    // Handle any errors here
    console.error('Error in fetchFareData:', error.message);
    throw error; // You can throw an error here or handle it as needed
  }
}

async function fetchParameterValues(
  operatorId,
  resultWrapper,
  paramList,
  paramIds,
  serverType,
) {
  var fetchParamQuery = `SELECT 
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
  } else if (paramIds.length) {
    fetchParamQuery += ` WHERE pr.param_id IN (?) `;
    values.push(paramIds);
  }
  if (serverType == rideConstants.SERVER_FLAG.AUTH) {
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
  return result;
}

async function insertRequiredDocument(requiredFields) {
  var insertObj = {
    operator_id: requiredFields.operator_id,
    document_name: requiredFields.document_name,
    document_type: requiredFields.document_type,
  };
  if (requiredFields.num_images_required) {
    insertObj.num_images_required = requiredFields.num_images_required;
  }
  if (requiredFields.instructions) {
    insertObj.instructions = requiredFields.instructions;
  }
  if (requiredFields.gallery_restricted) {
    insertObj.gallery_restricted = requiredFields.gallery_restricted;
  }
  if (requiredFields.document_category) {
    insertObj.document_category = requiredFields.document_category;
  }
  if (requiredFields.bank_details) {
    insertObj.bank_details = requiredFields.bank_details;
  }
  if (requiredFields.include_expiry) {
    insertObj.include_expiry = requiredFields.include_expiry;
  }
  if (requiredFields.text_doc_category) {
    insertObj.text_doc_category = requiredFields.text_doc_category;
  }
  // Extract keys and values from insertObj
  const keys = Object.keys(insertObj);
  const values = Object.values(insertObj);

  // Build the SET part dynamically
  const setClause = keys.map((key) => `\`${key}\` = ?`).join(', ');
  var insertQuery = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} SET ${setClause}`;

  var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, insertQuery, values);
  return result.insertId;
}

async function insertCityDocument(cityDocFields) {
  var insertObj = {
    city_id: cityDocFields.city_id,
    vehicle_type: cityDocFields.vehicle_type,
    document_id: cityDocFields.document_id,
    is_required: cityDocFields.is_required,
    is_active: 1,
  };

  // Extract keys and values from insertObj
  const keys = Object.keys(insertObj);
  const values = Object.values(insertObj);

  // Build the SET part dynamically
  const setClause = keys.map((key) => `\`${key}\` = ?`).join(', ');

  var insertQuery = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} SET ${setClause}`;

  var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, insertQuery, values);

  return result.insertId;
}

async function insertCitySubRegion(body) {
  var tableRow = {
    city_id: parseInt(body.city_id),
    operator_id: body.operatorId,
    region_name: body.region_name,
    vehicle_type: parseInt(body.vehicle_type),
    vehicle_color:
      rideConstants.ICON_SET_VEHICLE_MAP[parseInt(body.vehicle_type)] ||
      rideConstants.ICON_SET_VEHICLE_MAP[rideConstants.VEHILCE_TYPE.TAXI],
    ride_type: parseInt(body.ride_type),
    max_people: parseInt(body.max_people),
    destination_mandatory: parseInt(body.destination_mandatory),
    fare_mandatory: parseInt(body.fare_mandatory),
    show_fare_estimate: parseInt(body.show_fare_estimate) || 0,
    display_order: parseInt(body.display_order) || 0,
    vehicle_tax: parseFloat(body.vehicle_tax) || 0,
    reverse_bidding_enabled: parseInt(body.reverse_bidding_enabled) || 0,
    bid_config:
      parseInt(body.bid_config) || rideConstants.BID_CONFIG.AUTO_CANCEL,
    images: body.images,
    applicable_gender: body.applicable_gender || null,
    config: JSON.stringify(body.config) || null,
  };

  // Extract keys and values from insertObj
  const keys = Object.keys(tableRow);
  const values = Object.values(tableRow);

  // Build the SET part dynamically
  const setClause = keys.map((key) => `\`${key}\` = ?`).join(', ');

  var insertQuery = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} SET ${setClause}`;

  var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, insertQuery, values);

  return result.insertId;
}

async function insertDefaultFares(body, type) {
  var tableRow = {
    city: parseInt(body.city_id),
    operator_id: body.operatorId,
    fare_fixed: 10,
    vehicle_type: parseInt(body.vehicle_type),
    fare_per_km: 5,
    ride_type: parseInt(body.ride_type),
    fare_threshold_distance: 1,
    fare_per_min: 1,
    fare_per_km_threshold_distance: 0,
    fare_per_km_after_threshold: 5,
    fare_per_km_before_threshold: 0,
    fare_threshold_time: 0,
    fare_threshold_waiting_time: 0,
    per_ride_driver_subsidy: 0,
    accept_subsidy_per_km: 0,
    type: type,
    business_id: 1,
    region_id: body.region_id || 0,
    start_time: '00:00:00',
    end_time: '24:00:00',
  };

  // Extract keys and values from insertObj
  const keys = Object.keys(tableRow);
  const values = Object.values(tableRow);

  // Build the SET part dynamically
  const setClause = keys.map((key) => `\`${key}\` = ?`).join(', ');

  var insertQuery = `INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.VEHICLE_FARE} SET ${setClause}`;

  var result = await db.RunQuery(dbConstants.DBS.LIVE_DB, insertQuery, values);

  return result;
}

async function getTolldata(body, operatorId) {
  // Base query
  let query = `
    SELECT 
      t.*, 
      gt.name AS toll_type, 
      csr.region_name 
    FROM 
      ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.TOLL_TABLE} t 
    LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.GEOFENCE_TOLL_TYPES} gt 
      ON t.geofenc_typ_ref = gt.id AND gt.status = ? 
    LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REGIONS} csr 
      ON t.vehicle_type = csr.vehicle_type 
      AND csr.city_id = t.city_id 
      AND csr.is_active = ? 
      AND csr.operator_id = ? 
      AND csr.ride_type IN (0, 2, 10)
    WHERE 
      t.is_active = ?`;

  // Where conditions and values
  let whereConditions = [];
  let whereValues = [1, 1, operatorId, 1]; // Initial values for query placeholders

  // Add dynamic filters
  if (body.city_id) {
    whereConditions.push(`t.city_id = ?`);
    whereValues.push(body.city_id);
  }

  if (body.vehicle_type) {
    whereConditions.push(`t.vehicle_type = ?`);
    whereValues.push(body.vehicle_type);
  }

  if (body.toll_id) {
    whereConditions.push(`t.id = ?`);
    whereValues.push(body.toll_id);
  }

  if (body.request_ride_type) {
    whereConditions.push(`t.service_type = ?`);
    whereValues.push(body.request_ride_type);
  }

  // Append dynamic conditions to query
  if (whereConditions.length > 0) {
    query += ` AND ` + whereConditions.join(' AND ');
  }

  // Execute the query
  const result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, whereValues);

  return result;
}

async function insertGeofenceData(body) {
  let query = '';
  let whereValues = [];
  let result;

  // Handle INSERT operation
  if (body.insertData) {
    query = `
      INSERT INTO ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.TOLL_TABLE} 
      (city_id, name, rate, is_active, vehicle_type, geofenc_typ_ref, operator_id,service_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    whereValues.push(
      body.city_id,
      body.name,
      body.amount,
      1,
      body.vehicle_type,
      body.geofence_type,
      body.operator_id,
      body.request_ride_type,
    );
  } else {
    // Handle UPDATE operation
    const setClauses = [];
    let preTollPolygonCoordinates = '';
    let postTollPolygonCoordinates = '';

    // Generate polygon coordinates for pre_toll_polygon
    if (body.pre_toll_polygon) {
      preTollPolygonCoordinates = generatePolygonCoordinates(
        body.pre_toll_polygon,
      );
      setClauses.push(
        `pre_toll_polygon = GeomFromText('POLYGON((${preTollPolygonCoordinates}))')`,
      );
    }

    // Generate polygon coordinates for post_toll_polygon
    if (body.post_toll_polygon) {
      postTollPolygonCoordinates = generatePolygonCoordinates(
        body.post_toll_polygon,
      );
      setClauses.push(
        `post_toll_polygon = GeomFromText('POLYGON((${postTollPolygonCoordinates}))')`,
      );
    }

    // Add standard update fields
    if (body.city_id) {
      setClauses.push(`city_id = ?`);
      whereValues.push(body.city_id);
    }
    if (body.name) {
      setClauses.push(`name = ?`);
      whereValues.push(body.name);
    }
    if (body.amount) {
      setClauses.push(`rate = ?`);
      whereValues.push(body.amount);
    }
    if (body.vehicle_type) {
      setClauses.push(`vehicle_type = ?`);
      whereValues.push(body.vehicle_type);
    }
    if (body.geofenceType) {
      setClauses.push(`geofenc_typ_ref = ?`);
      whereValues.push(body.geofenceType);
    }
    if (body.is_active !== undefined) {
      setClauses.push(`is_active = ?`);
      whereValues.push(body.is_active);
    }
    // Build the final UPDATE query
    query = `UPDATE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.TOLL_TABLE}  SET ${setClauses.join(', ')} WHERE id = ?`;
    whereValues.push(body.toll_id);
  }

  // Execute the query
  result = await db.RunQuery(dbConstants.DBS.LIVE_DB, query, whereValues);

  // Fetch the updated or inserted record
  const newQuery = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.TOLL_TABLE} WHERE id = ?`;
  const idToFetch = body.insertData ? result.insertId : body.toll_id;

  const fetchedResult = await db.RunQuery(dbConstants.DBS.LIVE_DB, newQuery, [
    idToFetch,
  ]);
  return fetchedResult;
}

// Helper function to generate polygon coordinates string
function generatePolygonCoordinates(polygonArray) {
  const coordinates = polygonArray.map((coord) => [coord.x, coord.y]);

  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    coordinates.push(coordinates[0]);
  }

  return coordinates.map((coord) => `${coord[0]} ${coord[1]}`).join(',');
}

module.exports = {
  fetchFareData,
  fetchVehiclesImagesFaresData,
  insertRequiredDocument,
  insertCityDocument,
  insertCitySubRegion,
  fetchParameterValues,
  formatOperatorCityFields,
  readImageFile,
  uploadFileToS3,
  insertDefaultFares,
  getTolldata,
  insertGeofenceData,
};
