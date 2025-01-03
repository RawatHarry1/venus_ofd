const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
} = require('../../../bootstart/header');

const rideConstant = require('../../../constants/rideConstants');
const rideHelper = require('../helper');
var Joi = require('joi');
var QueryBuilder = require('datatable');
exports.getTicketList = async function (req, res) {
  var response = {};
  try {
    let body = req.body;

    delete body.token;

    const schema = Joi.object({
      city_id: Joi.number().integer().required(),
      page: Joi.number().integer().default(1), // Default to page 1
      limit: Joi.number().integer().default(10), // Default to 10 items per page
      status: Joi.alternatives()
        .try(Joi.number().valid(0, 1, 2), Joi.allow(null))
        .optional(), // Accepts 0, 1, 2, or null
      user_type: Joi.alternatives()
        .try(Joi.number().valid(0, 1), Joi.allow(null))
        .optional(), // Accepts 0, 1, or null
      created_at: Joi.date().allow(null).optional(), // Accepts valid date or null
    });

    const result = schema.validate(body);

    if (result.error) {
      response = {
        flag: ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING,
        message: 'Params missing or invalid',
      };
      return res.send(response);
    }

    let response = {};
    const page = body.page;
    const limit = body.limit;
    const offset = (page - 1) * limit;
    const cityId = body.city_id;
    const operatorId = req.operator_id;

    // Building query criteria based on filters
    const criteria = [
      ...(body.status !== undefined && body.status !== null
        ? [{ key: 'status', value: body.status }]
        : []),
      ...(body.user_type !== undefined && body.user_type !== null
        ? [{ key: 'user_type', value: body.user_type }]
        : []),
      ...(body.created_at
        ? [
            {
              key: 'created_at',
              value: `>= '${body.created_at}'`,
              custom: true,
            },
          ]
        : []),
      ...(cityId !== undefined && cityId !== null
        ? [{ key: 'city_id', value: cityId }]
        : []),
      ...(operatorId !== undefined && operatorId !== null
        ? [{ key: 'operator_id', value: operatorId }]
        : []),
    ];

    const requiredKeys = ['*'];

    let tickets = await db.SelectFromTable(
      dbConstants.DBS.LIVE_DB,
      `${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.TICKETS}`,
      requiredKeys,
      criteria,
      [],
      false,
      { limit, offset },
    );
    let totalCountQuery = `
            SELECT COUNT(*) as total
            FROM tb_support_tickets
            ${criteria.length ? 'WHERE ' + criteria.map((c) => (c.custom ? `${c.key} ${c.value}` : `${c.key} = ?`)).join(' AND ') : ''}
        `;
    let totalCountParams = criteria
      .filter((c) => !c.custom)
      .map((c) => c.value);

    let totalCountResult = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      totalCountQuery,
      totalCountParams,
    );
    const totalCount = totalCountResult[0]?.total || 0;

    var data = {
      tickets,
      pagination: {
        total: totalCount,
        current_page: page,
        total_pages: Math.ceil(totalCount / limit) || 0,
      },
    };
    return responseHandler.success(req, res, 'User Details Sents', data);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};


exports.updateTicket = async function (req, res) {

  try {
    let body = req.body;
    delete body.token;
    const schema = Joi.object({
      city_id: Joi.number().integer().required(),
      ticket_id: Joi.number().integer().required(),
      status: Joi.number().valid(0, 1, 2).required(),
      admin_response: Joi.string().max(255).optional()
    });

    const result = schema.validate(body);

    if (result.error) {
      return res.send({
        flag: ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING,
        message: 'Params missing or invalid',
      });
    }

    const { ticket_id, status, admin_response, city_id } = body;
    const operatorId = req.operator_id;

    await db.updateTable(dbConstants.DBS.LIVE_DB, dbConstants.LIVE_DB.TICKETS, {
      status: status,
      admin_id: req.user_id,
      response_at: new Date(),
      admin_response: admin_response
    }, [{ key: 'operator_id', value: operatorId }, { key: 'city_id', value: city_id }, { key: 'id', value: ticket_id }]);
    return responseHandler.success(req, res, 'Ticket updated successfully', {});
  } catch (error) {
    errorHandler.errorHandler(error, req, res);

  }
}

const getIssueTags = async (dbName, condition) => {
  const query = `SELECT tag.tag_id, tag.issue_category_id, tag.tag_name, tag.action_type,
    tag.tag_display_text AS text, tag.is_eng_required, tag.user_type,
    cat.cat_id, cat.category_name 
    FROM ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.ISSUE} AS tag
    INNER JOIN ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.ISSUE_CATEGORY} AS cat
    ON tag.issue_category_id = cat.cat_id
    WHERE tag.is_active = 1 ${condition}`;
  return db.RunQuery(dbName, query);
};

const organizeIssuesByLevel = (data, type) => {
  const levels = [];
  data.forEach((issue) => {
    if (issue.user_type === type) {
      levels[issue.level] = levels[issue.level] || [];
      levels[issue.level].push(issue);
    }
  });
  return levels;
};

const findNextLevelEntries = (level, parentId, issuesArray, levels) => {
  const currentLevelIssues = levels[level] || [];
  currentLevelIssues.forEach((issue) => {
    if (issue.parent_id === parentId && (issue.action_type === 2 || issue.action_type === 0)) {
      issuesArray.push(issue);
    }
    if (issue.action_type === 1) {
      issue.nodes = [];
      findNextLevelEntries(level + 1, issue.tag_id, issue.nodes, levels);
    }
  });
};

exports.getCancelledRidesIssueTags = async function (req, res) {
  try {
    const { user_type } = req.body;
    const userTypeCondition = parseInt(user_type)
      ? `AND cat.category_name IN ('Rides', 'Fare', 'General', 'Cancellation')
          AND tag.tag_display_text NOT IN (
            'Ride Fare not generated', 'Wrong fare generated (Distance/Time)',
            'Fare generated manually', 'Luggage Charge Raised',
            'Customer forgot his/her belongings in auto')
          AND tag.is_eng_required = 1 AND tag.user_type IN (1, 3)`
      : `AND cat.category_name IN ('General', 'Wallet', 'Payments', 'Cancellation')
          AND tag.is_eng_required = 1 AND tag.user_type IN (0, 2)
          AND tag.tag_display_text NOT IN (
            'Customer forgot his/her belongings in auto',
            'Venus Wallet Credit Issues', 'Double Deductions')`;

    const issueTags = await getIssueTags(dbConstants.DBS.LIVE_DB, userTypeCondition);
    const responseData = {
      driver_cancelled_rides_issues: user_type === 0 || user_type === 2 ? [] : issueTags,
      customer_cancelled_rides_issues: user_type === 0 || user_type === 2 ? issueTags : [],
    };

    responseData.delivery_issues = await getIssueTags(
      dbConstants.DBS.LIVE_LOGS,
      "AND request_type = 6 AND tag.is_eng_required = 1"
    );

    const menuIssues = await getIssueTags(
      dbConstants.DBS.LIVE_LOGS,
      "AND request_type = 5 AND tag.is_eng_required = 1"
    );

    const customerLevels = organizeIssuesByLevel(menuIssues, 0);
    const driverLevels = organizeIssuesByLevel(menuIssues, 1);

    responseData.customer_issues_menu = [];
    responseData.driver_issues = [];

    findNextLevelEntries(0, -9999, responseData.customer_issues_menu, customerLevels);
    findNextLevelEntries(0, -9999, responseData.driver_issues, driverLevels);

    return responseHandler.success(req, res, 'User Details Sent', responseData);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
