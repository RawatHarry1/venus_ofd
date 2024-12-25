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


exports.fetchParameterValues = async function (operatorId, resultWrapper, paramList, paramIds, serverType) {
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