const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  generalConstants,
} = require('../../bootstart/header');

exports.validateUserUsingIdOrPhone = async function (
  fieldName,
  fieldValue,
  operatorId,
  loginType,
) {
  try {
    let userQuery;
    if (loginType == 0) {
      userQuery = `SELECT user_id, user_name, phone_no, user_email, user_name, current_location_latitude as lat, current_location_latitude as lng, access_token AS user_access_token FROM ${dbConstants.DBS.LIVE_DB}.tb_users WHERE ${fieldName} = ? AND operator_id = ?`;
    } else if (loginType == 1) {
      userQuery = `SELECT customer_id FROM  ${dbConstants.DBS.LIVE_DB}.tb_customers WHERE customer_id = ? AND operator_id = ?`;
    }

    var data = await db.RunQuery(dbConstants.DBS.LIVE_DB, userQuery, [
      fieldValue,
      operatorId,
    ]);

    if (!data.length) {
      throw new Error('Invalid user.');
    }

    return data[0];
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.checkUserCorporate = async function (corporateId, userId) {
  try {
    let userQuery = `SELECT user_id FROM ${dbConstants.DBS.LIVE_DB}.tb_corporate_users WHERE business_id = ? AND user_id = ?`;

    var data = await db.RunQuery(dbConstants.DBS.LIVE_DB, userQuery, [
      corporateId,
      userId,
    ]);

    return data[0];
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.fetchUserListWithPagination = async function (
  params,
  userBucket,
  queryParams,
) {
  let userQuery = ` ${dbConstants.DBS.LIVE_DB}.tb_users ~NEW_CONDITION~ `;
  let values = [];

  let limit = Number(queryParams.iDisplayLength || 50);
  let offset = Number(queryParams.iDisplayStart || 0);

  switch (userBucket) {
    case 0:
      userQuery += `user_id IN (?) AND operator_id = ? AND city = ? AND reg_as = 0`;
      values = [params.users, params.operator_id, params.city];
      break;
    case 1:
      userQuery += `can_request = 1 AND operator_id = ? AND city = ? AND reg_as = 0`;
      values = [params.operator_id, params.city];
      break;
    case 2:
      userQuery += `can_request = 1 AND operator_id = ? AND device_type = ? AND city = ? AND reg_as = 0`;
      values = [params.operator_id, params.device_type, params.city];
      break;
  }

  if (queryParams.sSearch) {
    userQuery += ' AND user_id LIKE ? ';
    values.push(queryParams.sSearch + '%');
  }

  let selectQuery = `SELECT phone_no, user_id, user_email, city AS city_id, country_code FROM ${userQuery} LIMIT ? OFFSET ?`;
  let recordsTotalQuery = `SELECT COUNT(*) AS count FROM ${userQuery}`;

  values.push(limit, offset);

  selectQuery = selectQuery.replace(/~NEW_CONDITION~/g, 'WHERE');
  recordsTotalQuery = recordsTotalQuery.replace(/~NEW_CONDITION~/g, 'WHERE');

  const [allData, userCount] = await Promise.all([
    await db.RunQuery(dbConstants.DBS.LIVE_DB, selectQuery, values),
    await db.RunQuery(dbConstants.DBS.LIVE_DB, recordsTotalQuery, values),
  ]);

  let finalUsers = [];
  for (let k in allData) {
    if (allData[k].phone_no.indexOf('x') !== -1) {
      continue;
    }
    finalUsers.push(allData[k]);
  }

  return {
    users: finalUsers || [],
    iTotalDisplayRecords: finalUsers.length || 0,
    iTotalRecords: userCount[0].count || 0,
  };
};
