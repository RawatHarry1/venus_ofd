const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  generalConstants,
} = require('../../../bootstart/header');

const Helper = require('../helper');
var Joi = require('joi');

exports.getUserCreditLogs = async function (req, res) {
  try {
    delete req.query.token;
    const schema = Joi.object({
      user_id: Joi.number().integer().positive().required(),
    });

    const result = schema.validate(req.query);
    if (result.error) {
      return res.send({
        flag: ResponseConstants.RESPONSE_STATUS.PARAMETER_MISSING,
        message: 'Params missing or invalid',
      });
    }

    const userId = req.query.user_id;
    const operatorId = req.operator_id;

    const transactionsQuery = `
        SELECT * FROM (
          SELECT
            wt.amount, wt.logged_on, wt.reference_id, wt.txn_type, wt.event AS txn_event,
            wt.client_id, wt.txn_id, wt.creditedBy, 'N/A' AS created_by, 'N/A' AS reason
          FROM
            ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.TNX} wt
          JOIN
            ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.AUTH_USERS} users
            ON wt.user_id = users.user_id
          WHERE
            users.venus_autos_user_id = ? AND users.operator_id = ? AND wt.event NOT IN (24, 25, 26, 27)
  
          UNION
  
          SELECT
            wt.amount, wt.logged_on, wt.reference_id, wt.txn_type, wt.event AS txn_event,
            wt.client_id, wt.txn_id, wt.creditedBy, recharge.created_by, recharge.reason
          FROM
            ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.TNX} wt
          JOIN
            ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.AUTH_USERS} users
            ON wt.user_id = users.user_id
          LEFT JOIN
            ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.CREDIT_LOGS} recharge
            ON recharge.id = wt.reference_id
          WHERE
            users.venus_autos_user_id = ? AND users.operator_id = ? AND wt.event IN (24, 25, 26, 27)
  
          UNION
  
          SELECT DISTINCT
            pwt.amount, pwt.updated_at AS logged_on, pwt.engagement_id AS reference_id,
            -1 AS txn_type, -1 AS txn_event, pwt.client_id, pwt.pending_txn_id AS txn_id,
            'admin' AS creditedBy, 'N/A' AS created_by, 'Engagement Debit' AS reason
          FROM
            ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.PENDING_TNX} pwt
          JOIN
            ${dbConstants.DBS.AUTH_DB}.${dbConstants.AUTH_DB.AUTH_USERS} users
            ON pwt.user_id = users.user_id
          JOIN
            ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.CREDIT_LOGS} recharge
            ON recharge.ref_engagement_id = pwt.engagement_id
          WHERE
            users.venus_autos_user_id = ? AND users.operator_id = ? AND is_settled = 0 AND pwt.owner = 2 AND recharge.type = 2
        ) AS transactions
        ORDER BY logged_on DESC, txn_type DESC;
      `;

    const transactionsData = await db.RunQuery(
      dbConstants.DBS.AUTH_DB,
      transactionsQuery,
      [userId, operatorId, userId, operatorId, userId, operatorId],
    );

    const handleTransaction = async (transaction) => {
      if (transaction.creditedBy === 'admin' && transaction.txn_type === 2) {
        const emailQuery = `
            SELECT created_by AS email, reason
            FROM ${dbConstants.DBS.LIVE_LOGS}.${dbConstants.LIVE_LOGS.CREDIT_LOGS}
            WHERE ref_engagement_id = ? AND type = 2 AND created_at = ?;
          `;

        const emailData = await db.RunQuery(
          dbConstants.DBS.AUTH_DB,
          emailQuery,
          [transaction.reference_id, transaction.logged_on],
        );

        if (emailData.length) {
          transaction.created_by = emailData[0].email;
          transaction.reason = emailData[0].reason;
        } else {
          transaction.creditedBy = 'system';
          transaction.created_by = 'N/A';
          transaction.reason = 'Debt settlement';
        }
      } else {
        switch (transaction.creditedBy) {
          case 'customer':
            transaction.reason =
              transaction.txn_type === 1
                ? 'Adding Money to Wallet'
                : 'Ride Payment Using Wallet';
            break;
          case 'driver':
            transaction.reason =
              transaction.txn_type === 1 ? 'Adding Money to Wallet' : 'N/A';
            break;
        }
      }

      if (transaction.creditedBy === 'system') {
        const txnReasons = {
          9: 'Promo Code Applied',
          17: 'Referral Gift - Driver',
          18: 'Driver Incentive',
          25: 'Referral Gift - Customer',
        };

        transaction.reason =
          txnReasons[transaction.txn_type] || transaction.reason;

        if (transaction.txn_type === 2 && transaction.txn_event === 15) {
          transaction.reason = 'Commission Deducted';
        }
      }

      return transaction;
    };

    const processedTransactions = await Promise.all(
      transactionsData.map(handleTransaction),
    );

    return responseHandler.success(req, res, 'TNX', processedTransactions);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
