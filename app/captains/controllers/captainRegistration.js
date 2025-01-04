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

var notUploadedDocs = function (driver, mandatoryDocCount) {
  return (
    driver.pending_submitted_docs +
      driver.pending_not_submitted_docs +
      driver.approved_docs <
      mandatoryDocCount && driver.verification_status == -1
  );
};
var mandDocsUploaded = function (driver, mandatoryDocCount) {
  return (
    driver.pending_submitted_docs +
      driver.pending_not_submitted_docs +
      driver.approved_docs >=
      mandatoryDocCount && driver.verification_status == -1
  );
};
var activeDrivers = function (driver, mandatoryDocCount) {
  return driver.verification_status == 1;
};

var elmExpiredDrivers = function (driver, mandatoryDocCount) {
  if (driver.expired_docs > 0) {
    return driver.expired_docs > 0 && driver.verification_status == 1;
  } else {
    return false;
  }
};

exports.getCaptainEnrollment = async function (req, res) {
  try {
    var response = {};
    var cityId = parseInt(req.body.city_id);
    var vehicleType = parseInt(req.body.vehicle_type);
    var fleetId = req.fleet_id;
    var requestRideType = req.request_ride_type;
    var operatorId = req.operator_id || 1;
    let orderDirection = req.body.sSortDir_0 || 'DESC';
    orderDirection = orderDirection.toUpperCase() == 'ASC' ? 'ASC' : 'DESC';
    var tab = req.body.tab;

    var drivers = await fetchTotalDrivers(
      vehicleType,
      operatorId,
      cityId,
      fleetId,
      tab,
      requestRideType,
      orderDirection,
    );
    var totalCount = await fetchTotalDriversCount(
      vehicleType,
      operatorId,
      cityId,
      fleetId,
      tab,
      requestRideType,
      orderDirection,
    );
    var mandatory_docs = await fetchMandatoryDocsCount(
      vehicleType,
      operatorId,
      cityId,
    );
    var driversCount = totalCount.count;
    var mandatoryDocCount = mandatory_docs[0].count;

    var filterFn;
    switch (+tab) {
      case 1:
        filterFn = notUploadedDocs;
        break;
      case 2:
        filterFn = mandDocsUploaded;
        break;
      case 3:
        filterFn = activeDrivers;
        break;
      case 4:
        filterFn = elmExpiredDrivers;
        break;
      default:
        console.error('Invalid tab type');
    }

    var filteredDriverArr = [];
    for (var i = 0; i < drivers.length; i++) {
      var condition = filterFn(drivers[i], mandatoryDocCount);
      if (condition) {
        drivers[i]['total_mandatory_docs'] = mandatoryDocCount;
        drivers[i]['total_mandatory_docs_uploaded'] =
          drivers[i].pending_submitted_docs +
          drivers[i].pending_not_submitted_docs +
          drivers[i].approved_docs;
        //Includes the one that have been approved.
        filteredDriverArr.push(drivers[i]);
      }
    }

    response = {
      iTotalRecords: driversCount,
      iTotalDisplayRecords: filteredDriverArr.length,
      data: filteredDriverArr,
    };
    return responseHandler.success(req, res, '', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};

async function fetchTotalDrivers(
  vehicleType,
  operatorId,
  cityId,
  fleetId,
  tab,
  requestRideType,
  orderDirection,
) {
  var isRequired = [
    documentsConstant.REQUIRED_DOCS.MANDATORY_FOR_DRIVING,
    documentsConstant.REQUIRED_DOCS.MANDATORY_FOR_REGISTRATION,
  ];
  var values = [
    documentsConstant.DOCUMENT_CATEGORY.DRIVER_DOCUMENT,
    isRequired.join(','),
    vehicleType,
    operatorId,
    cityId,
  ];
  var fleetPlaceholder = '';
  var serviceTypePlaceholder = '';

  if (fleetId) {
    fleetPlaceholder = ' AND d.fleet_id IN (?)';
    values.push(fleetId);
  }
  if (requestRideType) {
    serviceTypePlaceholder = ' AND d.service_type IN (?)';
    values.push(requestRideType);
  }

  var query = `
        SELECT 
                SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.PENDING} THEN 1 ELSE 0 END) AS pending_submitted_docs,
                SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.UPLOADED} THEN 1 ELSE 0 END) AS pending_not_submitted_docs,
                SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.REJECTED} THEN 1 ELSE 0 END) AS rejected_docs,
                SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.APPROVED} THEN 1 ELSE 0 END) AS approved_docs,
                d.driver_id, d.name, COALESCE(d.date_first_activated,d.date_registered) AS date_registered, phone_no, verification_status, 
                d.elm_eligibility_expiry_date, 
                MAX(docs.updated_at) AS last_uploaded_on,d.service_type,
                SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.EXPIRED} THEN 1 ELSE 0 END) AS 
                expired_docs,
                d.driver_id, d.name, COALESCE(d.date_first_activated,d.date_registered) AS date_registered, phone_no, 
                verification_status, d.elm_eligibility_expiry_date, d.service_type,
                MAX(docs.updated_at) AS last_uploaded_on
                FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} d 
            LEFT JOIN (
                SELECT dd.driver_id, dd.document_id, cd.city_id, 
                cd.vehicle_type, cd.is_active, cd.is_required, 
                dd.updated_at, dd.status
                FROM 
                
                ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAIN_DOCUMENTS}  dd 
                JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd
                ON cd.document_id = dd.document_id
                JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd
                ON cd.document_id = rd.document_id 
                WHERE rd.document_category = ? 
            ) AS docs ON d.driver_id = docs.driver_id 
            AND (docs.city_id = d.city_id OR docs.city_id = 0) 
            AND docs.vehicle_type = d.vehicle_type AND docs.is_active = 1 
            AND docs.is_required IN (?) 
            WHERE d.driver_suspended = 0 AND d.autos_enabled = 1
            AND d.vehicle_type = ? AND d.operator_id = ? AND d.city_id = ? ${fleetPlaceholder} ${serviceTypePlaceholder}
            GROUP BY d.driver_id ORDER BY d.date_registered ${orderDirection} `;

  if (tab == 1) {
    var query = `SELECT 
            IFNULL(SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.PENDING} THEN 1 ELSE 0 END), 0) AS pending_submitted_docs,
            IFNULL(SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.UPLOADED} THEN 1 ELSE 0 END), 0) AS pending_not_submitted_docs,
            IFNULL(SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.REJECTED} THEN 1 ELSE 0 END), 0) AS rejected_docs,
            IFNULL(SUM(CASE WHEN docs.status = ${documentsConstant.DOCUMENT_STATUS.APPROVED} THEN 1 ELSE 0 END), 0) AS approved_docs,
            d.driver_id, 
            d.name, 
            COALESCE(d.date_first_activated, d.date_registered) AS date_registered, 
            phone_no,
            d.service_type, 
            IFNULL(verification_status, -1) AS verification_status,
            d.elm_eligibility_expiry_date,
            d.service_type, 
            MAX(docs.updated_at) AS last_uploaded_on
        FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} d 
        LEFT JOIN (
            SELECT 
                dd.driver_id, 
                dd.document_id, 
                cd.city_id, 
                cd.vehicle_type, 
                cd.is_active, 
                cd.is_required, 
                dd.updated_at, 
                dd.status
            FROM 
                ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAIN_DOCUMENTS} dd 
                JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd ON cd.document_id = dd.document_id
                JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd ON cd.document_id = rd.document_id 
            WHERE rd.document_category = ? 
        ) AS docs ON d.driver_id = docs.driver_id 
                AND (docs.city_id = d.city_id OR docs.city_id = 0) 
                AND docs.vehicle_type = d.vehicle_type AND docs.is_active = 1 
                AND docs.is_required IN (?) 
        WHERE d.driver_suspended = 0 AND d.autos_enabled = 1
            AND d.vehicle_type = ? AND d.operator_id = ? AND d.city_id = ? ${fleetPlaceholder} ${serviceTypePlaceholder}
            AND (docs.driver_id IS NOT NULL OR docs.driver_id IS NULL)
        GROUP BY d.driver_id 
        ORDER BY d.date_registered ${orderDirection} `;
  }

  return db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);
}

async function fetchTotalDriversCount(
  vehicleType,
  operatorId,
  cityId,
  fleetId,
  tab,
  requestRideType,
  orderDirection,
) {
  var isRequired = [
    documentsConstant.REQUIRED_DOCS.MANDATORY_FOR_DRIVING,
    documentsConstant.REQUIRED_DOCS.MANDATORY_FOR_REGISTRATION,
  ];
  var values = [
    documentsConstant.DOCUMENT_CATEGORY.DRIVER_DOCUMENT,
    isRequired.join(','),
    vehicleType,
    operatorId,
    cityId,
  ];
  var fleetPlaceholder = '';
  var serviceTypePlaceholder = '';

  if (fleetId) {
    fleetPlaceholder = ' AND d.fleet_id IN (?)';
    values.push(fleetId);
  }
  if (requestRideType) {
    serviceTypePlaceholder = ' AND d.service_type IN (?)';
    values.push(requestRideType);
  }

  var query = `
        SELECT 
        COUNT(*) as count
        FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} d 
        LEFT JOIN (
        SELECT dd.driver_id, dd.document_id, cd.city_id, 
        cd.vehicle_type, cd.is_active, cd.is_required, 
        dd.updated_at, dd.status
        FROM 

        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAIN_DOCUMENTS}  dd 
        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd
        ON cd.document_id = dd.document_id
        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd
        ON cd.document_id = rd.document_id 
        WHERE rd.document_category = ? 
        ) AS docs ON d.driver_id = docs.driver_id 
        AND (docs.city_id = d.city_id OR docs.city_id = 0) 
        AND docs.vehicle_type = d.vehicle_type AND docs.is_active = 1 
        AND docs.is_required IN (?) 
        WHERE d.driver_suspended = 0 AND d.autos_enabled = 1
        AND d.vehicle_type = ? AND d.operator_id = ? AND d.city_id = ? ${fleetPlaceholder} ${serviceTypePlaceholder}
        GROUP BY d.driver_id ORDER BY d.date_registered ${orderDirection} `;

  if (tab == 1) {
    var query = `SELECT COUNT(*) as count
        FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} d 
        LEFT JOIN (
        SELECT 
        dd.driver_id, 
        dd.document_id, 
        cd.city_id, 
        cd.vehicle_type, 
        cd.is_active, 
        cd.is_required, 
        dd.updated_at, 
        dd.status
        FROM 
        ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAIN_DOCUMENTS} dd 
        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd ON cd.document_id = dd.document_id
        JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd ON cd.document_id = rd.document_id 
        WHERE rd.document_category = ? 
        ) AS docs ON d.driver_id = docs.driver_id 
        AND (docs.city_id = d.city_id OR docs.city_id = 0) 
        AND docs.vehicle_type = d.vehicle_type AND docs.is_active = 1 
        AND docs.is_required IN (?) 
        WHERE d.driver_suspended = 0 AND d.autos_enabled = 1
        AND d.vehicle_type = ? AND d.operator_id = ? AND d.city_id = ? ${fleetPlaceholder} ${serviceTypePlaceholder}
        AND (docs.driver_id IS NOT NULL OR docs.driver_id IS NULL)
        GROUP BY d.driver_id 
        ORDER BY d.date_registered ${orderDirection} `;
  }

  return db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);
}

async function fetchMandatoryDocsCount(vehicleType, operatorId, cityId) {
  var query = `SELECT COUNT(*) as count FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_REQ_DOC} rd 
                JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY_DOC} cd 
                 ON rd.document_id = cd.document_id AND rd.operator_id = ? AND cd.city_id IN (0,?) 
                 AND cd.vehicle_type = ? AND cd.is_active = 1 AND is_required IN (?) and rd.document_category = ?`;

  var isRequired = [
    documentsConstant.REQUIRED_DOCS.MANDATORY_FOR_DRIVING,
    documentsConstant.REQUIRED_DOCS.MANDATORY_FOR_REGISTRATION,
  ];
  var values = [
    operatorId,
    cityId,
    vehicleType,
    isRequired.join(','),
    documentsConstant.DOCUMENT_CATEGORY.DRIVER_DOCUMENT,
  ];

  return db.RunQuery(dbConstants.DBS.LIVE_DB, query, values);
}
