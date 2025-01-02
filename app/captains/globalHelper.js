const { dbConstants,db,errorHandler,responseHandler,ResponseConstants, authConstants, rideConstants } = require('../.././bootstart/header');
const { checkBlank } = require('../rides/helper');


exports.getWalletTransactions                 = getWalletTransactions
exports.get_transaction_details               = get_transaction_details
exports.get_user_ref_code_used                = get_user_ref_code_used
exports.get_paytm_enabled                     = get_paytm_enabled
exports.get_dup_reg                           = get_dup_reg
exports.get_invalid_devices                   = get_invalid_devices
exports.getCustomerNotes                      = getCustomerNotes
exports.getRidesData                          = getRidesData
exports.getCouponsData                        = getCouponsData
exports.get_user_remaining_coupons            = get_user_remaining_coupons
exports.get_promotions_applicable             = get_promotions_applicable
exports.get_friends_details                   = get_friends_details
exports.getOngoingRide                        = getOngoingRide
exports.getCancelledRides                     = getCancelledRides
exports.getFirstRideCity                      = getFirstRideCity
exports.get_promotions                        = get_promotions



var detailsUserCount = {};

exports.detailsUserCount  = detailsUserCount;



async function getWalletTransactions(user_id,auth_user_id, walletTransactions, startFrom, pageSize) {
    try {
        var paytmTransactions = [], mobikwikTransactions = [], freechargeTransactions = [],
            razorPayTransactions = [], iciciTransactions = [], mPesaTransactions = [];

        // Execute all the transaction functions
        await get_paytmTransactions(user_id, auth_user_id, paytmTransactions, startFrom, pageSize);
        await getMobikwikTransactions(user_id, auth_user_id, mobikwikTransactions, startFrom, pageSize);
        await getFreechargeTransactions(user_id, auth_user_id, freechargeTransactions, startFrom, pageSize);
        await getRazorPayTransactions(user_id, auth_user_id, razorPayTransactions, startFrom, pageSize);
        await getIciciTransactions(user_id, auth_user_id, iciciTransactions, startFrom, pageSize);
        await getMpesaTransactions(user_id, auth_user_id, mPesaTransactions, startFrom, pageSize);

        for(var i = 0; i < paytmTransactions.length; i++) {
            var aObj = paytmTransactions[i];
            aObj.wallet_id   =  authConstants.WALLET_TYPE.PAYTM;
            aObj.wallet_type = 'Paytm';
            walletTransactions.push(aObj);
        }
        for(var i = 0; i < mobikwikTransactions.length; i++) {
            var aObj = mobikwikTransactions[i];
            aObj.wallet_id   = authConstants.WALLET_TYPE.MOBIKWIK;
            aObj.wallet_type = 'Mobikwik';
            walletTransactions.push(aObj);
        }
        for(var i = 0; i < freechargeTransactions.length; i++) {
            var aObj = freechargeTransactions[i];
            aObj.wallet_id   =  authConstants.WALLET_TYPE.FREECHARGE;
            aObj.wallet_type = 'Freecharge';
            walletTransactions.push(aObj);
        }
        for(var i = 0; i < razorPayTransactions.length; i++) {
            var aObj = razorPayTransactions[i];
            aObj.wallet_id   =  authConstants.WALLET_TYPE.RAZOR_PAY;
            aObj.wallet_type = 'RazorPay';
            walletTransactions.push(aObj);
        }
        for(var i = 0; i < iciciTransactions.length; i++) {
            var aObj = iciciTransactions[i];
            aObj.wallet_id   =  authConstants.WALLET_TYPE.ICICI;
            aObj.wallet_type = 'ICICI';
            walletTransactions.push(aObj);
        }
        for(var i = 0; i < mPesaTransactions.length; i++) {
            var aObj = mPesaTransactions[i];
            aObj.wallet_id   =  authConstants.WALLET_TYPE.MPESA;
            aObj.wallet_type = 'MPESA';
            walletTransactions.push(aObj);
        }
        walletTransactions.sort(function(a, b) {
            var d1 = new Date(a.updated_at);
            var d2 = new Date(b.updated_at);
            return d2 - d1;
        });
    } catch (error) {
        console.log(error);
        throw new Error(error.message)
    }
    
}

async function get_paytmTransactions(user_id,auth_user_id, paytmTransactions, startFrom, pageSize) {
    var userString;
    var userValue;

    if(auth_user_id){
        userString = 'user_id';
        userValue = auth_user_id;
    }
    else {
        userString = 'venus_autos_user_id';
        userValue = user_id;
    };

    var countSQL = `SELECT
    COUNT(1) AS number
  FROM (
    SELECT
      reference_id AS engagement_id,
      txns.order_id,
      request_type,
      req_logged_on,
      '' AS phone_no,
      txn_amount,
      txns.status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_add_money_txns adds
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = adds.cust_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.order_id = adds.order_id
    WHERE
      tb_users.${userString} = ? UNION
    SELECT
      reference_id AS engagement_id,
      txns.order_id,
      request_type,
      req_logged_on,
      '' AS phone_no,
      txn_amount,
      txns.status AS status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_withdraw_money_txns draws
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = draws.cust_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.order_id = draws.order_id
    WHERE
      tb_users.${userString} = ? UNION
    SELECT
      reference_id AS engagement_id,
      txns.order_id,
      '3' AS request_type,
      refund.logged_on AS req_logged_on,
      '' AS phone_no,
      refund.refund_amount AS txn_amount,
      txns.status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_refund_money_txns refund
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.order_id = refund.order_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = txns.user_id
    WHERE
      refund.resp_status = 'TXN_SUCCESS'
      AND tb_users.${userString} = ? UNION
    SELECT
      transfers.sender_user_id AS engagement_id,
      txns.order_id,
      txns.request_type,
      transfers.created_at AS req_logged_on,
      '' AS phone_no,
      transfers.amount AS txn_amount,
      txns.status AS status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_transfer_money transfers
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = transfers.receiver_user_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.reference_id = transfers.transfer_id
    WHERE
      tb_users.${userString} = ?
    ORDER BY
      req_logged_on DESC) AS test`;

    const count = await db.RunQuery(dbConstants.DBS.AUTH_DB, countSQL, [userValue, userValue, userValue, userValue]);

    exports.detailsUserCount.paytm_transactions = count[0].number;

    var get_paytm_data =
    `SELECT
      IFNULL(order_txns.order_id,txns.reference_id) AS engagement_id,
      txns.order_id,
      request_type,
      DATE_FORMAT(req_logged_on + interval 330 minute,
        '%Y/%m/%d %r') AS req_logged_on,
      '' AS phone_no,
      txn_amount,
      adds.status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_add_money_txns adds
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = adds.cust_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.order_id = adds.order_id
    LEFT JOIN
      tb_order_txns AS order_txns
    ON
      txns.reference_id = order_txns.txn_id and
      txns.client_id = order_txns.client_id
    WHERE
      tb_users.${userString} = ? UNION
    SELECT
      IFNULL(order_txns.order_id,txns.reference_id) AS engagement_id,
      txns.order_id,
      '3' AS request_type,
      DATE_FORMAT(refund.logged_on + interval 330 minute,
        '%Y/%m/%d %r') AS req_logged_on,
      '' AS phone_no,
      refund.refund_amount AS txn_amount,
      refund.status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_refund_money_txns refund
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.order_id = refund.order_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = txns.user_id
    LEFT JOIN
      tb_order_txns AS order_txns
    ON
      txns.reference_id = order_txns.txn_id and 
      txns.client_id = order_txns.client_id 
    WHERE
    refund.resp_status = 'TXN_SUCCESS' AND
      tb_users.${userString} = ? UNION
    SELECT
      IFNULL(order_txns.order_id,txns.reference_id) AS engagement_id,
      txns.order_id,
      request_type,
      DATE_FORMAT(req_logged_on + interval 330 minute,
        '%Y/%m/%d %r') AS req_logged_on,
      '' AS phone_no,
      txn_amount,
      draws.status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_withdraw_money_txns draws
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = draws.cust_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.order_id = draws.order_id
    LEFT JOIN
      tb_order_txns AS order_txns
    ON
      txns.reference_id = order_txns.txn_id and 
      txns.client_id = order_txns.client_id
    WHERE
      tb_users.${userString} = ? UNION
    SELECT
      transfers.sender_user_id AS engagement_id,
      txns.order_id,
      txns.request_type,
      DATE_FORMAT(transfers.created_at + interval 330 minute,
        '%Y/%m/%d %r') AS req_logged_on,
      '' AS phone_no,
      transfers.amount AS txn_amount,
      txns.status
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_transfer_money transfers
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users
    ON
      tb_users.user_id = transfers.receiver_user_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_paytm_wallet_txns txns
    ON
      txns.reference_id = transfers.transfer_id
    WHERE
      tb_users.${userString} = ?
    ORDER BY
      req_logged_on DESC
    LIMIT
      ?,
      ?`

    const data = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_paytm_data, [userValue, userValue, userValue, userValue, startFrom, pageSize]);

    for (var j = 0; j < data.length; j++) {
        var paytm_record = {};
        paytm_record.engagement_id = data[j].engagement_id;
        paytm_record.created_at = data[j].req_logged_on;
        // In order to keep object structure uniform in all wallet transactions
        paytm_record.updated_at = data[j].req_logged_on;
        paytm_record.amount = data[j].txn_amount;
        paytm_record.responseMessage = data[j].resp_respmsg;
        paytm_record.order_id = data[j].order_id;
        paytm_record.txn_type = data[j].request_type;
        paytm_record.phone_no = data[j].phone_no;
        paytm_record.status   = data[j].status;
        paytmTransactions.push(paytm_record);
    }
}

async function getMobikwikTransactions(userId,auth_user_id, mobikwikTransactions, startFrom, pageSize) {
    var userString;
    var userValue;

    if(auth_user_id){
        userString = 'user_id';
        userValue = auth_user_id;
    }
    else {
        userString = 'venus_autos_user_id';
        userValue = userId;
    }

    var countSQL = `SELECT 
  COUNT(*) as countTxns 
FROM 
  (
    SELECT 
      mobikwikTxns.* 
    FROM 
      ${dbConstants.DBS.AUTH_DB}.tb_mobikwik_wallet_txns as mobikwikTxns 
      JOIN ${dbConstants.DBS.AUTH_DB}.tb_users as users ON mobikwikTxns.user_id = users.user_id 
    WHERE 
      users.${userString} = ? 
    UNION 
    SELECT 
      refundTxns.* 
    FROM 
      ${dbConstants.DBS.AUTH_DB}.tb_mobikwik_wallet_txns as txns 
      JOIN ${dbConstants.DBS.AUTH_DB}.tb_users as users ON users.user_id = txns.user_id 
      JOIN ${dbConstants.DBS.AUTH_DB}.tb_mobikwik_refund_money_txns as refundTxns ON refundTxns.order_id = txns.order_id 
    WHERE 
      users.${userString} = ?
  ) as a
`;

    const countRes = await db.RunQuery(dbConstants.DBS.AUTH_DB, countSQL, [userValue, userValue]);

    exports.detailsUserCount.mobikwikTransactionDetails = countRes[0].countTxns;

    var sqlQuery = `SELECT
    *
  FROM (
    SELECT
      mobikwikTxns.order_id,
      mobikwikTxns.txn_type,
      mobikwikTxns.amount,
      mobikwikTxns.status,
      mobikwikTxns.created_at + interval 330 minute AS created_at,
      DATE_FORMAT(mobikwikTxns.updated_at + interval 330 minute,
        '%Y/%m/%d %r') AS updated_at,
      IFNULL(order_txns.order_id,mobikwikTxns.reference_id) AS engagement_id
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_mobikwik_wallet_txns AS mobikwikTxns
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users AS users
    ON
      mobikwikTxns.user_id = users.user_id
    LEFT JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_order_txns AS order_txns
    ON
      mobikwikTxns.reference_id = order_txns.txn_id and
      mobikwikTxns.client_id = order_txns.client_id
    WHERE
      users.${userString} = ? UNION
    SELECT
      refundTxns.order_id,
      3 AS txn_type,
      refundTxns.amount,
      IF(refundTxns.resp_status='success', 1, 0) AS status,
      refundTxns.created_at,
      DATE_FORMAT(refundTxns.updated_at,
        '%Y/%m/%d %r') AS updated_at,
      IFNULL(order_txns.order_id,txns.reference_id) AS engagement_id
    FROM
      ${dbConstants.DBS.AUTH_DB}.tb_mobikwik_wallet_txns AS txns
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_users AS users
    ON
      users.user_id = txns.user_id
    JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_mobikwik_refund_money_txns AS refundTxns
    ON
      refundTxns.order_id = txns.order_id
    LEFT JOIN
      ${dbConstants.DBS.AUTH_DB}.tb_order_txns AS order_txns
    ON
      txns.reference_id = order_txns.txn_id and 
      txns.client_id = order_txns.client_id
    WHERE
      users.${userString} = ? ) AS X
  ORDER BY
    created_at DESC
  LIMIT
    ?,
    ?`;

    const result = await db.RunQuery(dbConstants.DBS.AUTH_DB, sqlQuery, [userValue, userValue, startFrom, pageSize]);

    for(var i = 0; i < result.length; i++) {
        mobikwikTransactions.push(result[i]);
    }
}

async function getFreechargeTransactions(userId,auth_user_id, freechargeTransactions, startFrom, pageSize) {
    var userString;
    var userValue;

    if(auth_user_id){
        userString = 'user_id';
        userValue = auth_user_id;
    }
    else {
        userString = 'venus_autos_user_id';
        userValue = userId;
    }

    var countSQL = `SELECT 
  COUNT(*) as countTxns 
FROM 
  (
    SELECT 
      freechargeTxns.* 
    FROM 
      ${dbConstants.DBS.AUTH_DB}.tb_freecharge_wallet_txns as freechargeTxns 
      JOIN ${dbConstants.DBS.AUTH_DB}.tb_users as users ON freechargeTxns.user_id = users.user_id 
    WHERE 
      users.${userString} = ? ) as a
`;

    const countRes = await db.RunQuery(dbConstants.DBS.AUTH_DB, countSQL, [userValue]);

    exports.detailsUserCount.freechargeTransactionDetails = countRes[0].countTxns;

    var sqlQuery = `SELECT
                          freechargeTxns.order_id,
                          freechargeTxns.txn_type,
                          freechargeTxns.amount,
                          freechargeTxns.status,
                          DATE_FORMAT(freechargeTxns.created_at + interval 330 minute,
                            '%Y/%m/%d %r') AS created_at,
                          DATE_FORMAT(freechargeTxns.updated_at + interval 330 minute,
                            '%Y/%m/%d %r') AS updated_at,
                          IFNULL(order_txns.order_id,freechargeTxns.reference_id) AS engagement_id
                        FROM
                          ${dbConstants.DBS.AUTH_DB}.tb_freecharge_wallet_txns AS freechargeTxns
                        JOIN
                          ${dbConstants.DBS.AUTH_DB}.tb_users AS users
                        ON
                          freechargeTxns.user_id = users.user_id
                        LEFT JOIN
                          ${dbConstants.DBS.AUTH_DB}.tb_order_txns AS order_txns
                        ON
                          freechargeTxns.reference_id = order_txns.txn_id and 
                          freechargeTxns.client_id = order_txns.client_id
                        WHERE
                          users.${userString} = ?
                        ORDER BY
                          freechargeTxns.created_at DESC
                        LIMIT
                          ?,
                          ?`;

    const result = await db.RunQuery(dbConstants.DBS.AUTH_DB, sqlQuery, [userValue, startFrom, pageSize]);

    for(var i = 0; i < result.length; i++) {
        freechargeTransactions.push(result[i]);
    }
}

async function getRazorPayTransactions(userId,auth_user_id,razorPayTransactions,startFrom,pageSize) {
    var userString;
    var userValue;

    if(auth_user_id){
        userString = 'user_id';
        userValue = auth_user_id;
    }
    else {
        userString = 'venus_autos_user_id';
        userValue = userId;
    }

    var countSQL = `SELECT 
  COUNT(*) as countTxns 
FROM 
  (
    SELECT 
      razorPay.* 
    FROM 
      ${dbConstants.DBS.AUTH_DB}.tb_razorpay_txns as razorPay 
      JOIN ${dbConstants.DBS.AUTH_DB}.tb_users as users ON razorPay.user_id = users.user_id 
    WHERE 
      users.${userString} = ? ) as a
`

    const countRes = await db.RunQuery(dbConstants.DBS.AUTH_DB, countSQL, [userValue]);

    exports.detailsUserCount.razorPayTransactionDetails = countRes[0].countTxns;

    var razorPayTransactionDetailsQuery = `SELECT 
  razorPay.id AS order_id, 
  razorPay.txn_type, 
  razorPay.amount, 
  razorPay.status, 
  DATE_FORMAT(
    razorPay.created_at + interval 330 minute, 
    '%Y/%m/%d %r'
  ) AS created_at, 
  DATE_FORMAT(
    razorPay.updated_at + interval 330 minute, 
    '%Y/%m/%d %r'
  ) AS updated_at, 
  IFNULL(
    order_txns.order_id, razorPay.reference_id
  ) AS engagement_id 
FROM 
  ${dbConstants.DBS.AUTH_DB}.tb_razorpay_txns AS razorPay 
  JOIN ${dbConstants.DBS.AUTH_DB}.tb_users AS users ON razorPay.user_id = users.user_id 
  LEFT JOIN tb_order_txns AS order_txns ON razorPay.reference_id = order_txns.txn_id 
  and razorPay.client_id = order_txns.client_id 
WHERE 
  users.${userString} = ? 
ORDER BY 
  razorPay.created_at DESC 
LIMIT 
  ?, 
  ?
`

    const razorPayDetails = await db.RunQuery(dbConstants.DBS.AUTH_DB, razorPayTransactionDetailsQuery, [userValue, startFrom, pageSize]);

    if(!razorPayDetails.length){
        razorPayTransactions    =   [];
    }

    for(var i = 0; i < razorPayDetails.length; i++) {
        razorPayTransactions.push(result[i]);
    }
}

async function getIciciTransactions(userId, auth_user_id, iciciTransactions, startFrom, pageSize,) {
    var userString;
    var userValue;

    if (auth_user_id) {
        userString = 'user_id';
        userValue = auth_user_id;
    }
    else {
        userString = 'venus_autos_user_id';
        userValue = userId;
    }

    var iciciTransactionsQuery = `SELECT 
  icici.id AS order_id, 
  amount, 
  txn_type, 
  status, 
  DATE_FORMAT(
    icici.created_at + interval 330 minute, 
    '%Y/%m/%d %r'
  ) AS created_at, 
  DATE_FORMAT(
    icici.updated_at + interval 330 minute, 
    '%Y/%m/%d %r'
  ) AS updated_at, 
  IFNULL(
    order_txns.order_id, icici.reference_id
  ) AS engagement_id 
FROM 
  ${dbConstants.DBS.AUTH_DB}.tb_icici_upi_txns AS icici 
  JOIN ${dbConstants.DBS.AUTH_DB}.tb_users AS users ON icici.user_id = users.user_id 
  LEFT JOIN tb_order_txns AS order_txns ON icici.reference_id = order_txns.txn_id 
  and icici.client_id = order_txns.client_id 
WHERE 
  users.${userString} = ? 
ORDER BY 
  icici.created_at DESC 
LIMIT 
  ?, 
  ?
`

    const iciciTransactionDetails = await db.RunQuery(dbConstants.DBS.AUTH_DB, iciciTransactionsQuery, [userValue, startFrom, pageSize]);

    if (!iciciTransactionDetails.length) {
        iciciTransactions = [];
    }

    for (var i = 0; i < iciciTransactionDetails.length; i++) {
        iciciTransactions.push(result[i]);
    }
}

async function getMpesaTransactions(userId,auth_user_id, mPesaTransactions, startFrom, pageSize) {
    var userString;
    var userValue;

    if(auth_user_id){
        userString = 'user_id';
        userValue = auth_user_id;
    }
    else {
        userString = 'venus_autos_user_id';
        userValue = userId;
    }

    var countQuery = `SELECT 
  COUNT(*) as countTxns 
FROM 
  (
    SELECT 
      mpesa.*
    FROM 
      ${dbConstants.DBS.AUTH_DB}.tb_mpesa_transactions as mpesa 
      JOIN ${dbConstants.DBS.AUTH_DB}.tb_users as users ON mpesa.user_id = users.user_id 
    WHERE 
      users.${userString} = ? ) as a
`

    const countRes = await db.RunQuery(dbConstants.DBS.AUTH_DB, countQuery, [userValue]);

    exports.detailsUserCount.mPesa = countRes[0].countTxns;

    var sqlQuery = `SELECT 
  mpesa.id, 
  mpesa.txn_type, 
  mpesa.amount, 
  mpesa.status, 
  DATE_FORMAT(
    mpesa.created_at + interval 330 minute, 
    '%Y/%m/%d %r'
  ) AS created_at, 
  DATE_FORMAT(
    mpesa.updated_at + interval 330 minute, 
    '%Y/%m/%d %r'
  ) AS updated_at, 
  IFNULL(
    order_txns.order_id, mpesa.reference_id
  ) AS engagement_id 
FROM 
  ${dbConstants.DBS.AUTH_DB}.tb_mpesa_transactions AS mpesa 
  JOIN ${dbConstants.DBS.AUTH_DB}.tb_users AS users ON mpesa.user_id = users.user_id 
  LEFT JOIN tb_order_txns AS order_txns ON mpesa.reference_id = order_txns.txn_id 
  and mpesa.client_id = order_txns.client_id 
WHERE 
  users.${userString} = ? 
ORDER BY 
  mpesa.created_at DESC 
LIMIT 
  ?, 
  ?
`

    const result = await db.RunQuery(dbConstants.DBS.AUTH_DB, sqlQuery, [userValue, startFrom, pageSize]);

    for(var i = 0; i < result.length; i++) {
        mPesaTransactions.push(result[i]);
    }
}


async function get_transaction_details(app_id, logged_on, amount, transaction_state, account_balance, reference, user_id, auth_user_id,
  user_name, user_email, user_phone_no, user_is_blocked, user_can_request,
  user_city, user_debt, block_reason, block_reason_text, date_registered,
  deviceName, osVersion, appVersionCode, userCategory, isDeactivated, deactivationReason, dateOfBirth,
  startFrom, pageSize) {

  var userString;
  var userValue;

  if (auth_user_id) {
    userString = 'user_id';
    userValue = auth_user_id;
  }
  else {
    userString = 'venus_autos_user_id';
    userValue = user_id;
  };

  var get_balance = `SELECT 
  users.money_in_wallet_f as money_in_wallet, 
  users.user_name, 
  users.user_email, 
  users.phone_no, 
  live_users.user_category, 
  users.can_request as can_request, 
  users.is_blocked as is_blocked, 
  live_users.city AS city_reg, 
  users.user_debt, 
  live_users.verification_status AS user_status, 
  users.date_registered, 
  users.device_name, 
  users.os_version, 
  users.venus_autos_app_version,
  live_users.user_image AS customer_image
FROM 
  ${dbConstants.DBS.AUTH_DB}.tb_users as users 
  LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CUSTOMERS} as live_users ON live_users.user_id = users.venus_autos_user_id
WHERE 
  users.${userString} = ?
`;

  const data = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_balance, [userValue]);

  account_balance.push(data[0].money_in_wallet);
  var userName = data[0].user_name.toLowerCase().split(' ');
  var userStatus = data[0].user_status
  for (var i = 0; i < userName.length; i++) {
    userName[i] = userName[i].replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  userName = userName.join(' ');
  user_name.push(userName);
  user_name.push(userStatus)
  user_name.push(data[0].customer_image)
  user_email.push(data[0].is_deactivated ? data[0].del_email : data[0].user_email);
  user_phone_no.push(data[0].is_deactivated ? data[0].del_phone_no : data[0].phone_no);
  user_city.push(data[0].city_reg);
  //var blocked = data[0].is_blocked == 0 ? 1:0;
  user_is_blocked.push(data[0].is_blocked);
  user_can_request.push(data[0].can_request);
  user_debt.push(data[0].user_debt);
  deviceName.push(data[0].device_name);
  osVersion.push(data[0].os_version);
  date_registered.push(data[0].date_registered);
  appVersionCode.push((data[0].venus_autos_app_version).toString().split('').join('.'));
  isDeactivated.push(data[0].is_deactivated);
  deactivationReason.push(data[0].deactivation_reason);
  dateOfBirth.push(data[0].date_of_birth);
  userCategory.push(data[0].user_category);

  var countSQL = `SELECT 
  COUNT(1) AS number 
FROM 
  (
    Select 
      amount, 
      logged_on, 
      reference_id, 
      txn_type, 
      client_id 
    from 
      ${dbConstants.DBS.AUTH_DB}.tb_wallet_transactions 
    where 
      user_id = (
        Select 
          user_id 
        from 
          ${dbConstants.DBS.AUTH_DB}.tb_users 
        where 
          ${userString} = ?
      ) 
    order by 
      txn_id desc
  ) AS test
`
  const count = await db.RunQuery(dbConstants.DBS.AUTH_DB, countSQL, [userValue]);
  exports.detailsUserCount.transactionDetails = count[0].number;

  var get_transaction_details =

    `SELECT
         a.amount,
         a.logged_on,
         ifnull(order_txns.order_id,a.reference_id) as reference_id,
         a.txn_type,
         a.client_id
       FROM
         ${dbConstants.DBS.AUTH_DB}.tb_wallet_transactions as a 
         JOIN 
         ${dbConstants.DBS.AUTH_DB}.tb_users as users on a.user_id = users.user_id
         LEFT JOIN
         ${dbConstants.DBS.AUTH_DB}.tb_order_txns as order_txns on 
         a.reference_id = order_txns.txn_id and
         a.client_id = order_txns.client_id
       WHERE
           users.${userString} = ?
       ORDER BY
         logged_on DESC
       LIMIT
         ?,
         ?`

  const data_tr = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_transaction_details, [userValue, startFrom, pageSize]);
  for (var j = 0; j < data_tr.length; j++) {
    var ist_logged_on = convert_to_ist(data_tr[j].logged_on);
    logged_on.push(ist_logged_on);
    amount.push(data_tr[j].amount);
    reference.push(data_tr[j].reference_id);
    transaction_state.push(data_tr[j].txn_type);
    if (data_tr[j].client_id == 'g3Ql58Kx2VCDYVk3')
      app_id.push('venus');
    else if (data_tr[j].client_id == 'EEBUOvQq7RRJBxJm')
      app_id.push('Autos');
    else if (data_tr[j].client_id == 'QNrWRzMToQNnxrQ5')
      app_id.push('Meals');
    else
      app_id.push('');
  }

  if (data[0].can_request == 0) {
    var get_blocking_reason = `Select 
  reasons.reason_code, 
  reasons.reason 
From 
  ${dbConstants.DBS.AUTH_DB}.tb_can_request_reason reasons 
  Inner Join ${dbConstants.DBS.AUTH_DB}.tb_users users on reasons.user_id = users.user_id 
Where 
  users.${userString} = ? 
order by 
  reasons.request_id desc
`

    const reason = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_blocking_reason, [userValue]);
    block_reason.push(reason[0].reason_code);
    block_reason_text.push(reason[0].reason);
  }

}


async function get_user_ref_code_used(ref_code, user_ref_code, referrer, user_id, auth_user_id) {
  var userString;
  var userValue;

  if (auth_user_id) {
    userString = 'user_id';
    userValue = auth_user_id;
  } else {
    userString = 'venus_autos_user_id';
    userValue = user_id;
  }

  const get_ref_code_used = `SELECT referral_code_used as ref, referral_code FROM ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.CUSTOMERS} WHERE ${userString} = ?`;

  try {
    const data = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_ref_code_used, [userValue]);

    if (data.length === 0) {
      ref_code.push('');
      user_ref_code.push('');
      referrer.push('');
    } else {
      ref_code.push(data[0].ref);
      user_ref_code.push(data[0].referral_code);

      if (checkBlank([data[0].ref]) === 0) {
        const get_referrer = `SELECT venus_autos_user_id FROM ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.CUSTOMERS} WHERE referral_code = ?`;
        const referred_by = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_referrer, [data[0].ref]);

        if (referred_by.length === 0) {
          referrer.push('');
        } else {
          referrer.push(referred_by[0].venus_autos_user_id);
        }
      }
    }
  } catch (err) {
    throw new Error(`Error fetching referral code data: ${err.message}`);
  }
}

async function get_paytm_enabled(user_id, auth_user_id, paytm_enabled) {
  var userString;
  var userValue;

  if (auth_user_id) {
      userString = 'user_id';
      userValue = auth_user_id;
  } else {
      userString = 'venus_autos_user_id';
      userValue = user_id;
  }

  const get_info = `
      SELECT paytm_enabled, mobikwik_enabled, freecharge_enabled 
      FROM ${dbConstants.DBS.AUTH_DB}.${dbConstants.LIVE_DB.CUSTOMERS} 
      WHERE ${userString} = ?`;

  try {
      const data = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_info, [userValue]);

      if (data.length !== 0) {
          paytm_enabled.enabled = data[0].paytm_enabled;
          paytm_enabled.mobikwik_enabled = data[0].mobikwik_enabled;
          paytm_enabled.freecharge_enabled = data[0].freecharge_enabled;
      }
  } catch (err) {
      throw new Error(`Error while checking for Paytm integration: ${err.message}`);
  }
}

async function get_dup_reg(user_id, auth_user_id, dup_reg) {
  var userString;
  var userValue;

  if (auth_user_id) {
      userString = 'user_id';
      userValue = auth_user_id;
  } else {
      userString = 'venus_autos_user_id';
      userValue = user_id;
  }

  const get_dup_reg_new = `
      SELECT count(1) as num_reg 
      FROM tb_users u1 
      INNER JOIN tb_users u2 on u1.unique_device_id_reg = u2.unique_device_id_reg 
      AND u1.unique_device_id_reg is not null 
      AND u1.unique_device_id_reg not in ('', 0, 'not_found') 
      AND u1.date_registered > u2.date_registered 
      WHERE u1.${userString} = ?`;

  try {
      const dup_data = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_dup_reg_new, [userValue]);

      dup_reg.push(dup_data[0].num_reg);
  } catch (err) {
      throw new Error(`Error while fetching duplicate registrations: ${err.message}`);
  }
}

async function get_invalid_devices(user_id, auth_user_id, dev_count) {
  var userString;
  var userValue;

  if (auth_user_id) {
      userString = 'user_id';
      userValue = auth_user_id;
  } else {
      userString = 'venus_autos_user_id';
      userValue = user_id;
  }

  const get_invalid_devices = `
      SELECT count(1) as num 
      FROM tb_failed_user_benefits as txns 
      LEFT JOIN tb_users as users 
      ON users.user_id = txns.user_id 
      WHERE users.${userString} = ?`;

  try {
      const data = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_invalid_devices, [userValue]);
      dev_count.push(data[0].num);
  } catch (err) {
      throw new Error(`Error while fetching invalid devices: ${err.message}`);
  }
}

async function getCustomerNotes(user_id, responseData) {
  const notesQuery = `
      SELECT * 
      FROM ${dbConstants.DBS.LIVE_DB}.tb_notes 
      WHERE user_id = ? 
      AND user_type = 1`;

  try {
      const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, notesQuery, [user_id]);
      
      if (!data.length) {
        responseData.user_notes = []
      }
      
      responseData.user_notes = data || [];
  } catch (error) {
      throw new Error(`Error while fetching customer notes: ${error.message}`);
  }
}

async function getRidesData(discount,paid_by_customer,values_time,driver_name,ride_dis,ride_time,amount,
  payment_mode,account_id,coupon_title, engagement_ids,user_id, driverIds,paid_using_paytm, paid_using_mobikwik, paid_using_freecharge,
  amount_venus_wallet, convenience_charge, convenience_charge_waiver, ride_source,
  ride_type, isStartEnd, isStartEndReversed, isStartEndAutomated, rideRating, startFrom, pageSize,
) {

  const countQuery = `
      SELECT COUNT(1) AS number 
      FROM tb_engagements
      JOIN tb_session ON tb_engagements.session_id = tb_session.session_id
      WHERE tb_engagements.status = 3 AND tb_engagements.user_id = ?
  `;

  const dataQuery = `
      SELECT 
          tb_engagements.engagement_id, pickup_time, tb_engagements.driver_id, distance_travelled,
          tb_engagements.ride_time, tb_engagements.paid_using_mobikwik, tb_engagements.paid_using_freecharge,
          money_transacted, ss.preferred_payment_mode as payment_mode, paid_by_customer, paid_using_wallet, paid_using_paytm,
          tb_engagements.discount, tb_accounts.account_id, tb_coupons.title as coupon_title, tb_drivers.driver_id as user_id, tb_drivers.name as driver_name,
          tb_engagements.convenience_charge, tb_engagements.convenience_charge_waiver, tb_engagements.user_rating, tb_engagements.driver_rating,
          CASE
              WHEN ss.ride_type = 3 THEN 'Dodo'
              WHEN ss.ride_type = 4 THEN 'Delivery Pool'
              ELSE COALESCE(bu.partner_name, 'Venus')
          END as ride_source,
          CASE
              WHEN ss.ride_type = 3 THEN 'Dodo'
              WHEN ss.ride_type = 2 THEN 'Autos Pool'
              WHEN ss.ride_type = 4 THEN 'Delivery Pool'
              WHEN ss.ride_type = 0 AND tb_engagements.vehicle_type = 2 THEN 'Bike'
              WHEN ss.ride_type = 0 AND tb_engagements.vehicle_type = 3 THEN 'Taxi'
              WHEN ss.ride_type = 0 AND tb_engagements.vehicle_type = 1 THEN 'Autos'
              ELSE 'Autos'
          END as ride_type
      FROM ${dbConstants.DBS.LIVE_DB}.tb_engagements
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.tb_session ss ON ss.session_id = tb_engagements.session_id
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.tb_accounts ON tb_accounts.account_id = ss.applicable_account_id
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.tb_coupons ON tb_coupons.coupon_id = tb_accounts.coupon_id
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.tb_business_users bu ON ss.is_manual = bu.business_id
      JOIN tb_drivers ON tb_drivers.driver_id = tb_engagements.driver_id
      WHERE tb_engagements.status = 3 AND tb_engagements.user_id = ?
      ORDER BY engagement_id DESC
      LIMIT ?, ?
  `;

  try {
    const count = await db.RunQuery(dbConstants.DBS.LIVE_DB, countQuery, [user_id]);
    exports.detailsUserCount.recentRides = count[0].number;

    const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, dataQuery, [user_id, startFrom, pageSize]);

    for (var j = 0; j < data.length; j++) {
      var ist_pickup = convert_to_ist(data[j].pickup_time);
      values_time.push(ist_pickup);
      driverIds.push(data[j].driver_id);
      driver_name.push(data[j].driver_name);
      ride_dis.push(data[j].distance_travelled);
      ride_time.push(data[j].ride_time);
      amount.push(data[j].money_transacted);
      payment_mode.push(data[j].payment_mode);
      account_id.push(data[j].account_id);
      coupon_title.push(data[j].coupon_title);
      paid_by_customer.push(data[j].paid_by_customer);
      discount.push(data[j].discount);
      engagement_ids.push(data[j].engagement_id);
      paid_using_paytm.push(data[j].paid_using_paytm);
      paid_using_mobikwik.push(data[j].paid_using_mobikwik);
      paid_using_freecharge.push(data[j].paid_using_freecharge);
      amount_venus_wallet.push(data[j].paid_using_wallet);
      convenience_charge.push(data[j].convenience_charge);
      convenience_charge_waiver.push(data[j].convenience_charge_waiver);
      ride_source.push(data[j].ride_source);
      ride_type.push(data[j].ride_type);
      isStartEnd.push(data[j].start_end);
      if (data[j].start_end != null) {
        isStartEndReversed.push(data[j].start_end_reversed);
        isStartEndAutomated.push(data[j].is_automated);
      }
      else {
        isStartEndReversed.push(null);
        isStartEndAutomated.push(null);
      }
      var rideRateObj = {
        "user_rating": data[j].user_rating,
        "driver_rating": data[j].driver_rating,
        "Dname": data[j].driver_name
      };
      rideRating.push(rideRateObj);
    }
  } catch (error) {
    throw new Error(`Error while fetching rides data: ${error.message}`);
  }
}

async function getCouponsData(userId, startFrom, pageSize, coupons) {
  // SQL query to count the total number of coupons
  const countSQL = `
      SELECT COUNT(1) AS number
      FROM (
          SELECT a.added_on, a.expiry_date, a.redeemed_on, a.reason, c.title, a.status
          FROM (
              SELECT added_on, redeemed_on, account_id, status, expiry_date, coupon_id, reason
              FROM tb_accounts
              WHERE user_id = ?
          ) AS a
          JOIN (
              SELECT coupon_id, title
              FROM tb_coupons
          ) AS c
          ON a.coupon_id = c.coupon_id
          ORDER BY a.account_id DESC
      ) AS test
  `;

  const countResult = await db.RunQuery(dbConstants.DBS.LIVE_DB, countSQL, [userId]);

  // Store the total count of coupons in a global object
  exports.detailsUserCount.couponsData = countResult[0].number;



  // SQL query to fetch paginated coupon data
  const getDataSQL = `
          SELECT 
              DATE_FORMAT(a.added_on + INTERVAL 330 MINUTE, '%Y/%m/%d %r') AS given_on,
              DATE_FORMAT(a.expiry_date + INTERVAL 330 MINUTE, '%Y/%m/%d %r') AS expiry_date,
              DATE_FORMAT(a.redeemed_on + INTERVAL 330 MINUTE, '%Y/%m/%d %r') AS redeemed_on,
              a.reason,
              c.title,
              a.stat AS status,
              c.max_benefit
          FROM (
              SELECT 
                  added_on,
                  redeemed_on,
                  account_id,
                  CASE 
                      WHEN status = 0 THEN 'Expired'
                      WHEN status = 1 THEN 'Available'
                      WHEN status = 2 THEN 'Redeemed'
                      ELSE '' 
                  END AS stat,
                  expiry_date,
                  coupon_id,
                  reason
              FROM tb_accounts
              WHERE user_id = ?
          ) AS a
          JOIN (
              SELECT 
                  coupon_id,
                  title,
                  CASE 
                      WHEN benefit_type = 1 THEN discount_maximum
                      WHEN benefit_type = 2 THEN capped_fare_maximum
                      WHEN benefit_type = 3 THEN cashback_maximum
                      ELSE NULL 
                  END AS max_benefit
              FROM tb_coupons
          ) AS c
          ON a.coupon_id = c.coupon_id
          ORDER BY a.added_on DESC
          LIMIT ?, ?
      `;

  const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, getDataSQL, [userId, startFrom, pageSize]);

  // Transform the result data and store it in the coupons object
  coupons.couponData = data.map(coupon => ({
    givenOn: coupon.given_on,
    expiryDate: coupon.expiry_date,
    redeemedOn: coupon.redeemed_on,
    reason: coupon.reason,
    title: coupon.title,
    status: coupon.status,
    maxBenefit: coupon.max_benefit,
  }));
}

async function get_user_remaining_coupons(user_id, number) {
  var get_data = `Select count(*) as num from tb_accounts where user_id = ? and status = 1`;
  const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, get_data, [user_id, number]);
  number[0] = data[0].num;
}


async function get_promotions_applicable(promo_titles, customer_fare_factor, driver_fare_factor, preferred_payment_mode, user_id, startFrom, pageSize) {
  var get_data = `Select 
  * 
from 
  (
    Select 
      engagement_id, 
      tb_session.customer_fare_factor, 
      tb_session.preferred_payment_mode, 
      driver_fare_factor, 
      tb_ride_promotions.title as promotion_title, 
      money_transacted, 
      iPromotions.promo_name as integratedPromoTitle, 
      tb_session.master_coupon " +
        " 
    from 
      ${dbConstants.DBS.LIVE_DB}.tb_engagements 
      left join ${dbConstants.DBS.LIVE_DB}.tb_session on tb_engagements.session_id = tb_session.session_id
      left join ${dbConstants.DBS.LIVE_DB}.tb_ride_promotions on tb_session.applicable_promo_id = tb_ride_promotions.promo_id
      LEFT JOIN ${dbConstants.DBS.AUTH_DB}.tb_integrated_promotions as iPromotions ON tb_session.applicable_promo_id = iPromotions.promo_id
    where 
      tb_engagements.status = 3 
      and tb_engagements.user_id = ? 
    order by 
      engagement_id desc
  ) as eng 
LIMIT 
  ?, 
  ?
`;
  const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, get_data, [user_id, startFrom, pageSize]);
  for (var i = 0; i < data.length; i++) {
    customer_fare_factor.push(data[i].customer_fare_factor);
    driver_fare_factor.push(data[i].driver_fare_factor);
    preferred_payment_mode.push(data[i].preferred_payment_mode);
    /*
     * If master_coupon is set to 1, pick auth's tb_integrated_promotions title.
     */
    if (data[i].master_coupon == 1 && data[i].integratedPromoTitle != null) {
      promo_titles.push(data[i].integratedPromoTitle);
    }
    else if (data[i].promotion_title != null) {
      promo_titles.push(data[i].promotion_title);
    }
    else {
      promo_titles.push('NA');
    }
  }
}

async function get_friends_details(user_id,details){

  var get_friends = `SELECT
                        DISTINCT u.venus_autos_user_id,
                        u.user_id,
                        u.user_name,
                        u.phone_no,
                        u.user_email,
                        u.verification_status,
                        u.first_transaction_on,
                        u.date_registered,
                        CASE
                          WHEN b.reg_as = 1 THEN 'Driver'
                          ELSE 'User'
                        END AS type,
                        CASE
                          WHEN w2.logged_on IS NULL AND u3.unique_device_id_reg IS NOT NULL THEN 1
                          ELSE 0
                        END AS is_duplicate,
                        fub.failed_reason
                      FROM
                        ${dbConstants.DBS.AUTH_DB}.tb_users u
                      JOIN
                        ${dbConstants.DBS.AUTH_DB}.tb_users u2
                      ON
                        u.referral_code_used = u2.referral_code
                        AND u2.referral_code!=''
                        AND u2.venus_autos_user_id = ?
                      JOIN
                        ${dbConstants.DBS.LIVE_DB}.tb_users AS b
                      ON
                        u.venus_autos_user_id = b.user_id
                      LEFT JOIN
                        ${dbConstants.DBS.AUTH_DB}.tb_users u3
                      ON
                        u.user_id != u3.user_id
                        AND u.unique_device_id_reg IS NOT NULL
                        AND u.unique_device_id_reg != 0
                        AND u.unique_device_id_reg !=''
                        AND u.unique_device_id_reg != 'not_found'
                        AND u.unique_device_id_reg = u3.unique_device_id_reg
                      LEFT JOIN
                        ${dbConstants.DBS.AUTH_DB}.tb_wallet_transactions w2
                      ON
                        w2.txn_type = 6
                        AND u.user_id=w2.user_id
                      LEFT JOIN
                        ${dbConstants.DBS.AUTH_DB}.tb_failed_user_benefits fub
                      ON
                        fub.user_id = u.user_id
                      GROUP BY
                        u.user_id
                        having u.venus_autos_user_id != ?
                      ORDER BY
                        u.date_registered DESC`;
                    
    const data = await db.RunQuery(dbConstants.DBS.AUTH_DB, get_friends, [user_id,user_id]);
    exports.detailsUserCount.friends = data.length;
    for(var i = 0; i < data.length; i++){
       details[i] = {};
       var info = {
           user_id : data[i].venus_autos_user_id,
           user_name : data[i].user_name,
           user_email : data[i].user_email,
           phone_no : data[i].phone_no,
           verification_status : data[i].verification_status,
           first_transaction_on : data[i].first_transaction_on,
           date_registered: data[i].date_registered,
           is_duplicate : data[i].is_duplicate,
           failed_reason : data[i].failed_reason,
           type: data[i].type
       };
       if(data[i].logged_on == null)
          details[i].first_transaction_on = '';
       else
          details[i].first_transaction_on = convert_to_ist(data[i].logged_on);
          details[i] = info;
    }
}

async function getOngoingRide(userId, ongoinRide){
  var get_data = `          SELECT
          engagement_id,
          accept_time,
          pickup_time,
          tb_drivers.driver_id,
          tb_engagements.status,
          tb_drivers.name AS driver_name,
          tb_session.applicable_promo_id,
          tb_session.applicable_account_id,
          tb_session.preferred_payment_mode,
          tb_session.applicable_account_id,
          tb_coupons.title AS coupon_title,
          tb_engagements.pickup_latitude,
          tb_engagements.pickup_longitude,
          tb_engagements.pickup_location_address,
          tb_engagements.drop_location_address,
          IF(tb_engagements.status=2,TIMESTAMPDIFF(MINUTE,
              tb_engagements.pickup_time,
              NOW()),0) AS ongoing_ride_time,
          tb_engagements.convenience_charge,
          tb_engagements.convenience_charge_waiver
        FROM
          ${dbConstants.DBS.LIVE_DB}.tb_engagements
        JOIN
          ${dbConstants.DBS.LIVE_DB}.tb_drivers
        ON
          tb_drivers.driver_id = tb_engagements.driver_id
        LEFT JOIN
          ${dbConstants.DBS.LIVE_DB}.tb_session
        ON
          tb_engagements.session_id = tb_session.session_id
        LEFT JOIN
          ${dbConstants.DBS.LIVE_DB}.tb_accounts
        ON
          tb_accounts.account_id = tb_session.applicable_account_id
        LEFT JOIN
          ${dbConstants.DBS.LIVE_DB}.tb_coupons
        ON
          tb_coupons.coupon_id = tb_accounts.coupon_id
        WHERE
          tb_engagements.status IN (?,
            ?,
            ?)
          AND tb_engagements.user_id = ?
        ORDER BY
          engagement_id DESC`;

          const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, get_data, [rideConstants.ENGAGEMENT_STATUS.ACCEPTED, rideConstants.ENGAGEMENT_STATUS.STARTED,rideConstants.ENGAGEMENT_STATUS.DRIVER_ARRIVED, userId]);

      for(var j = 0; j < data.length; j++){
          var ride = {};
          ride.engagement_id = data[j].engagement_id;
          ride.driver_id = data[j].driver_id;
          ride.accept_time = data[j].accept_time;
          ride.pickup_time = data[j].pickup_time;
          ride.driver_name = data[j].driver_name;
          ride.applicable_promo_id = data[j].applicable_promo_id;
          ride.applicable_account_id = data[j].applicable_account_id;
          ride.preferred_payment_mode = data[j].preferred_payment_mode;
          ride.applicable_account_id  = data[j].applicable_account_id;
          ride.coupon_title           = data[j].coupon_title;
          ride.pickup_latitude    = data[j].pickup_latitude;
          ride.pickup_longitude   = data[j].pickup_longitude;
          ride.conveneince_charge = data[j].conveneince_charge;
          ride.convenience_charge_waiver = data[j].convenience_charge_waiver;
          ride.rideStatus = data[j].status;
          ride.pickup_location_address = data[j].pickup_location_address;
          ride.drop_location_address  = data[j].drop_location_address;
          ride.ongoing_ride_time  =   data[j].ongoing_ride_time;
          ongoinRide.push(ride);
      }
}


async function getCancelledRides(user_id, cancelledRides, startFrom, pageSize, userType) {
  let userCondition = "";

  // Determine user condition based on user type
  if (userType === 1) {
    userCondition = "AND tb_engagements.user_id = ?";
  } else if (userType === 2) {
    userCondition = "AND tb_engagements.driver_id = ?";
  }

  // SQL to count cancelled rides
  const countSQL = `
    SELECT COUNT(1) AS number
    FROM ${dbConstants.DBS.LIVE_DB}.tb_engagements AS tb_engagements
    JOIN ${dbConstants.DBS.LIVE_DB}.tb_session ON tb_engagements.session_id = tb_session.session_id
    WHERE tb_engagements.status IN (8, 13)
    ${userCondition};
  `;

  try {
    const count = await db.RunQuery(dbConstants.DBS.LIVE_DB, countSQL, [user_id]);
    exports.detailsUserCount.cancelledRides = count[0].number;
    // driver.driverInfoCount.cancelledRides = count[0].number;

    // SQL to fetch cancelled ride details
    const queryString = `
      SELECT 
        tb_engagements.engagement_id,
        tb_session.cancellation_reasons,
        tb_engagements.status,
        tb_engagements.customer_cancellation_charges,
        tb_engagements.pickup_location_address,
        DATE_FORMAT(tb_engagements.accept_time + INTERVAL 330 MINUTE, '%Y/%m/%d %h:%i %p') AS accept_time,
        tb_session.session_id,
        tb_engagements.user_id,
        tb_engagements.driver_id,
        tb_engagements.cancel_distance,
        tb_engagements.cancel_distance_subsidy,
        tb_cancel_addn_reasons.reason AS other_reasons,
        tb_engagements.accept_distance,
        CASE
          WHEN tb_session.ride_type = 0 AND tb_engagements.vehicle_type = 1 THEN 'Autos'
          WHEN tb_session.ride_type = 0 AND tb_engagements.vehicle_type = 2 THEN 'Bike'
          WHEN tb_session.ride_type = 0 AND tb_engagements.vehicle_type = 3 THEN 'Taxi'
          WHEN tb_session.ride_type = 3 THEN 'Dodo'
          WHEN tb_session.ride_type = 4 THEN 'Delivery Pool'
          WHEN tb_session.ride_type = 2 THEN 'Pool'
          ELSE 'Autos'
        END AS ride_type,
        IF(refunds.id IS NULL, 0, 1) AS is_refunded,
        COALESCE(refunds.refund_jc, 0) AS refund_jc,
        COALESCE(refunds.refund_paytm) AS refund_paytm,
        CASE
          WHEN tb_session.ride_type = 3 THEN 'Dodo'
          WHEN tb_session.ride_type = 4 THEN 'Delivery Pool'
          ELSE COALESCE(bu.partner_name, 'Venus')
        END AS ride_source,
        IF(cancellationDebt.debt_type = 1 AND cancellationDebt.owner = 0, cancellationDebt.wallet_type, NULL) AS wallet_type,
        IF(cancellationDebt.debt_type = 1 AND cancellationDebt.owner = 0, cancellationDebt.settled_next_ride, NULL) AS settled_next_ride
      FROM ${dbConstants.DBS.LIVE_DB}.tb_engagements
      JOIN ${dbConstants.DBS.LIVE_DB}.tb_session ON tb_engagements.session_id = tb_session.session_id
      ${userCondition}
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.tb_cancel_addn_reasons ON tb_cancel_addn_reasons.session_id = tb_engagements.session_id
      LEFT JOIN ${dbConstants.DBS.LIVE_DB}.tb_business_users bu ON tb_session.is_manual = bu.business_id
      LEFT JOIN (
        SELECT id, SUM(refund_jc) AS refund_jc, SUM(refund_paytm) AS refund_paytm, eng_id
        FROM ${dbConstants.DBS.LIVE_LOGS}.tb_csp_refund_requests
        WHERE user_id = ?
      ) AS refunds ON refunds.eng_id = tb_engagements.engagement_id
      LEFT JOIN ${dbConstants.DBS.AUTH_DB}.tb_pending_wallet_txns AS cancellationDebt ON cancellationDebt.engagement_id = tb_engagements.engagement_id
      WHERE tb_engagements.status IN (8, 13) AND tb_engagements.ride_type IN (0, 1, 2, 10)
      ${userCondition}
      ORDER BY tb_engagements.engagement_id DESC
      LIMIT ?, ?;
    `;

    // Fetch the cancelled ride details
    const cancelData = await db.RunQuery(dbConstants.DBS.LIVE_DB, queryString, [user_id, user_id, user_id, startFrom, pageSize]);

    // Map the results into a structured format
    cancelData.forEach((data, index) => {
      const resJson = {
        serial_no: index + 1,
        eng_id: data.engagement_id,
        cancelled_by: data.status === 8 ? "driver" : "user",
        reason: data.cancellation_reasons || data.other_reasons,
        pickup_location: data.pickup_location_address,
        cancelled_on: data.accept_time,
        user_id: data.user_id,
        driver_id: data.driver_id,
        cancel_distance_subsidy: data.cancel_distance_subsidy,
        cancel_distance: data.cancel_distance,
        ride_type: data.ride_type,
        accept_distance: data.accept_distance,
        ride_source: data.ride_source,
        cancellation_charges: data.customer_cancellation_charges,
        is_refunded: data.is_refunded,
        amount_refunded: (data.refund_jc + data.refund_paytm),
        charged_via: data.wallet_type || -1,
      };

      // Check if debt was settled in next ride
      if (data.settled_next_ride > 0) {
        resJson.charged_via = 0; // JC refund
      }

      cancelledRides.push(resJson);
    });

  } catch (err) {
    throw new Error(err.message);
  }
}

async function getFirstRideCity(user_id, firstRideCity) {
  const sqlQuery = `SELECT * FROM ${dbConstants.DBS.LIVE_DB}.tb_engagements WHERE user_id = ? AND status = 3 ORDER BY pickup_time ASC`;

  try {
    const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, sqlQuery, [user_id]);

    if (data.length === 0) {
      firstRideCity[0] = []
    }

    firstRideCity[0] = data[0].city;
  } catch (err) {
    throw new Error("Error fetching first ride city: ",err.message);
  }
}


async function getStartEndCasesCount(user_id, startEndCount, isDriver) {
  let conditionStr = '';

  if (isDriver) {
    conditionStr += 'cl_driver_id = ? ';
  } else {
    conditionStr += 'cl_user_id = ? ';
  }

  const sqlQuery = `SELECT COUNT(1) as start_end_count FROM tb_case_logs WHERE ${conditionStr} 
                    AND issue_id IS NOT NULL AND logged_on != '0000-00-00 00:00:00'`;

  try {
    const startEndCountData = await db.RunQuery(dbConstants.DBS.LIVE_DB, sqlQuery, [user_id]);

    startEndCount[0] = startEndCountData[0].start_end_count;
  } catch (err) {
    throw new Error("Error fetching start/end case count:  ",err.message);
  }
}

async function get_promotions(availablePromotions, user_id, startFrom, pageSize) {
  const get_data = `
    SELECT
      tb_ride_promotions.promo_id,
      title,
      start_time,
      end_time,
      discount_percentage,
      cashback_percentage,
      DATE_FORMAT(MAX(tb_engagements.current_time), '%m/%d/%Y %h:%i %p') AS last_used,
      COUNT(DISTINCT engagement_id) AS \`count\`
    FROM
      ${dbConstants.DBS.LIVE_DB}.tb_engagements
    JOIN
       ${dbConstants.DBS.LIVE_DB}.tb_session ON tb_engagements.session_id = tb_session.session_id
    JOIN
       ${dbConstants.DBS.LIVE_DB}.tb_ride_promotions ON tb_session.applicable_promo_id = tb_ride_promotions.promo_id
    WHERE
      tb_engagements.status = 3
      AND tb_engagements.user_id = ?
    GROUP BY
      promo_id
    ORDER BY
      last_used DESC
    LIMIT ?, ?
  `;

  try {
    const data = await db.RunQuery(dbConstants.DBS.LIVE_DB, get_data, [user_id, startFrom, pageSize]);

    availablePromotions.promotions = (data && data.length > 0) ? data : [];
  } catch (err) {
    throw new Error("Error fetching promotions: ", err.message);
  }
}


function convert_to_ist(date_val){
  //console.log("date_val = "+date_val);

  if(date_val == '0000-00-00 00:00:00'){
      return date_val;
  }
  var gmt_time = new Date(date_val);
  var another_date = gmt_time;
  var now = new Date();
  //console.log("gmt_time = "+gmt_time);
  //console.log("timeoffset = "+now.getTimezoneOffset());
  gmt_time.setTime(gmt_time.getTime() + 5.5*60*1000*60);
  //console.log("after = "+gmt_time);
  another_date = another_date.toLocaleDateString() +" "+another_date.toLocaleTimeString();
  //var converted_date = gmt_time.toLocaleString();
  return another_date;
}



