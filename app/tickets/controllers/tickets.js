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
