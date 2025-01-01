const { dbConstants,db,errorHandler,responseHandler,ResponseConstants, authConstants } = require('../.././bootstart/header');


exports.getWalletTransactions = getWalletTransactions


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

