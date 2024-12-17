const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const documentsConstant = require('../../../constants/document');
const rideHelper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');

exports.getClients = async function (req, res) {
  var response = {};
  try {
    let operatorId = req.operator_id;
    var requestRideType = req.request_ride_type;

    let cityId = req.query.city_id;

    let whereClause = [],
      values = [];

    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.operator_id = ? `);
    values.push(operatorId);

    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.city = ?`);
    values.push(cityId);
    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.reg_as = ?`);
    values.push(0);
    whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.can_request = ?`);
    values.push(1);

    if (req.query.sSearch) {
      whereClause.push(`${dbConstants.LIVE_DB.CUSTOMERS}.user_name LIKE ?`);
      values.push('%' + req.query.sSearch + '%');
    }

    if (whereClause.length) {
      whereClause = ' ' + whereClause.join(' AND ');
    } else {
      whereClause = '';
    }

    let limit = Number(req.query.iDisplayLength || 50);
    let offset = Number(req.query.iDisplayStart || 0);
    let orderDirection = req.query.sSortDir_0 || 'DESC';
    orderDirection = orderDirection.toUpperCase() == 'ASC' ? 'ASC' : 'DESC';

    let queryTotalCount = `
        SELECT 
            COUNT(${dbConstants.LIVE_DB.CUSTOMERS}.user_id) AS total_count
        FROM
           ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}  FORCE KEY(operator_id)
        WHERE ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}.operator_id = ? 
        AND ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS}.reg_as = 0
    `;
    let totalRecords = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queryTotalCount,
      [operatorId],
    );

    values.push(limit);
    values.push(offset);
    let queryData = `
        SELECT 
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_id,
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_name, 
            ${dbConstants.LIVE_DB.CUSTOMERS}.phone_no,
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_email, 
            UNIX_TIMESTAMP(last_login) as last_login,
            UNIX_TIMESTAMP(last_ride_on) as last_ride_on,
            ${dbConstants.LIVE_DB.CUSTOMERS}.total_rides_as_user,
            ${dbConstants.LIVE_DB.CUSTOMERS}.current_location_latitude AS latitude,
            ${dbConstants.LIVE_DB.CUSTOMERS}.current_location_longitude AS longitude,
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_image AS customer_image,
            UNIX_TIMESTAMP(date_registered) as date_registered 
        FROM
            ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} FORCE KEY(operator_id)
        WHERE
            ${whereClause}
        ORDER BY 
            ${dbConstants.LIVE_DB.CUSTOMERS}.user_id ${orderDirection}
        LIMIT ? OFFSET ?
    `;

    let paginatedRecords = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      queryData,
      values,
    );
    response = {
      aaData: paginatedRecords,
      iTotalDisplayRecords: paginatedRecords.length,
      iTotalRecords: totalRecords[0].total_count,
    };
    return responseHandler.success(req, res, 'User Details Sent', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
