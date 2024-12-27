const {
    dbConstants,
    db,
    errorHandler,
    responseHandler,
    rideConstants,
    ResponseConstants,
    generalConstants,
    authConstants,
  } = require('../../../bootstart/header');
  var moment = require('moment');
  var Joi = require('joi');
  const Helper = require('../helper');
  const rideConstant = require('../../../constants/rideConstants');
const { checkBlank } = require('../../rides/helper');


exports.fetchPolygon = async function (req, res) {
    try {
        var cityId = req.query.city_id;
        var operatorId = req.operator_id;
        var checkValues = checkBlank([cityId]);
        if(checkValues === 1) {
            return responseHandler.parameterMissingResponse(res, result.error);
        }

        var stmt = `SELECT AsText(COALESCE(o.polygon_coordinates, c.polygon_coordinates)) AS polygon_coordinates 
        FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY} c 
        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY} o ON c.city_id = o.city_id 
        WHERE o.city_id = ? AND o.operator_id = ?  `;

        var values = [cityId, operatorId];

        var cityWrapper = {};

        cityWrapper = await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            stmt,
            values,
        );
        var cityPolygonResult = cityWrapper[0].polygon_coordinates;
        cityPolygonResult = cityPolygonResult.replace("POLYGON((" , "");
        cityPolygonResult = cityPolygonResult.replace("))", "");
        var d = cityPolygonResult.split(",");

        var final = []
        for (var i in d){
            var temp = {};
            var l = d[i].split(" ");
            temp.x = l[0];
            temp.y = l[1];
            final.push(temp);
        }

      return responseHandler.success(req,res, 'Polygons fetched', final);
    } catch (error) {
      errorHandler.errorHandler(error, req, res);
    }
  };

  exports.updatePolygon = async function (req, res) {
    try {
        var cityId = req.body.city_id;
        var operatorToken = req.operator_token;
        var checkValues = checkBlank([cityId, operatorToken, req.body.coordinates]);
        if(checkValues === 1) {
            return responseHandler.parameterMissingResponse(res, result.error);
        }

        var cityId = req.body.city_id;
        var operatorId = req.operator_id;
        var cord = req.body.coordinates;
        var finalCord = JSON.parse(JSON.stringify(cord));
        if(finalCord.length < 5) {
            throw new Error("Polygon should have a minimum of four sides.");
        }
        var finalArr = [];
        for(var i in finalCord){
            var tempObj = [];
            tempObj.push(finalCord[i].x);
            tempObj.push(finalCord[i].y);
            finalArr.push(tempObj);
        }
        var data = req.body;
        data.password = generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD;
        data.city_id = cityId;
        data.operator_token = operatorToken;
        data.coordinates  = JSON.stringify(finalArr);

        var coordinates = JSON.parse(data.coordinates);
        var password = data.password;
        var isNew = req.body.is_new;

        if (password !== generalConstants.PASSWORDS.SUPER_ADMIN_PASSWORD) {
            throw new Error("You are not authorized to perform this function");
        }

        if (coordinates[0] != coordinates[coordinates.length - 1]) {
            coordinates.push(coordinates[0]);
        }

        var coordinatesString = coordinates[0][0] + " " + coordinates[0][1];
        for(var j = 1; j < coordinates.length; j++) {
            coordinatesString += "," + coordinates[j][0] + " " + coordinates[j][1];
        }

        var table = `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY}`;
        var condition = `city_id = ?`;
        var values = [cityId];
        if(!isNew) {
            table = `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY}`;
            condition += ` AND operator_id = ?`;
            values.push(operatorId);
        }
    
        var stmnt = `UPDATE 
                        ${table} 
                     SET 
                        polygon_coordinates = GeomFromText('POLYGON((` + coordinatesString + `))') ` +
                     `WHERE ${condition}`;

       await db.RunQuery(
            dbConstants.DBS.LIVE_DB,
            stmnt,
            values,
        );

        var table = `${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.CITY}`;
        var condition = `city_id = ?`;
        var values = [cityId];
        if(!isNew) {
            table = `${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.O_CITY}`;
            condition += ` AND operator_id = ?`;
            values.push(operatorId);
        }
        var stmnt = `UPDATE ${table} SET polygon_coordinates = GeomFromText('POLYGON((` + coordinatesString + `))') ` +`WHERE ${condition}`;
        await db.RunQuery(
            dbConstants.DBS.AUTH_DB,
            stmnt,
            values,
        );

      return responseHandler.success(req,res, 'Successfully updated polygon coordinates.', '');
    } catch (error) {
      errorHandler.errorHandler(error, req, res);
    }
};