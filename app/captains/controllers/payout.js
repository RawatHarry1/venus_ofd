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

exports.getPayouts = async function (req, res) {
  try {
    let opts = req.body;
    let stmt = ``;
    let values = [];
    var countQuery;
    let limitPlaceholder = '';
    let searchPlaceholder = '';
    let orderPlaceholder = `${opts.sSortDir_0 || 'DESC'}`;

    if (opts.iDisplayLength && opts.iDisplayStart) {
      limitPlaceholder = `LIMIT ${parseInt(opts.iDisplayLength)} OFFSET ${parseInt(opts.iDisplayStart)}`;
    }
    if (opts.sSearch) {
      searchPlaceholder = ` AND eng.engagement_id LIKE '%${opts.sSearch}%'`;
    }

    if (opts.driver && opts.city_id) {
      var subConditions = `eng.city in( SELECT city_id from  tb_operator_cities where city_id = ${opts.city_id} )  AND
						eng.status = 3`,
        having = '';
      if (opts.drivers) {
        subConditions += ` AND eng.driver_id in (${opts.drivers})`;
      }
      if (opts.rideId) {
        subConditions += ` AND eng.engagement_id in (${opts.rideId})`;
      }
      if (opts.dateTime) {
        subConditions += ` AND eng.engagement_date >= date('${opts.dateTime}')`;
      }
      if (opts.dateTimeTo) {
        subConditions += ` AND eng.engagement_date <= date('${opts.dateTimeTo}')`;
      }
      if (opts.payoutStatus) {
        subConditions += ` AND eng.payout_status = ${opts.payoutStatus}`;
      } else {
        subConditions += ` AND eng.payout_status = 0`;
      }

      if (opts.CeilingAmount) {
        having = ` HAVING daily_earnings - daily_venus_commission >= ${parseInt(
          opts.CeilingAmount,
        )}  `;
      }

      stmt = `
			SELECT
				SUM(eng.calculated_driver_fare) AS total_earning,
				SUM(eng.paid_by_customer) AS paid_by_customer,
				SUM(eng.calculated_driver_fare - eng.paid_by_customer) AS daily_earnings,
				SUM(eng.net_customer_tax) AS tax,
				SUM(eng.venus_commission) AS daily_venus_commission,
				COUNT(eng.engagement_id) AS total_rides,
				eng.engagement_date,
				eng.engagement_id,
				eng.driver_id,
				eng.payout_status,
				tdbd.name,
				tdbd.iban,
				tdbd.address,
				tdbd.bank_type,
				tdbd.sort_code,
				tbw.company_name,
				tbw.wallet_number,
				tbd.driver_id,
				tbd.name AS driver_name,
				tbd.phone_no,
				tbd.email,
				c.city_name,
				tbd.city_id
			FROM tb_engagements eng
			LEFT JOIN tb_driver_bank_details tdbd ON tdbd.driver_id = eng.driver_id
			LEFT JOIN tb_drivers tbd ON tbd.driver_id = eng.driver_id
			LEFT JOIN tb_cities c ON c.city_id = tbd.city_id
			LEFT JOIN tb_driver_wallet_number tbw ON tbw.driver_id = eng.driver_id AND tbw.status = 1
			WHERE
				${subConditions} ${searchPlaceholder}
			GROUP BY 
				eng.driver_id
			${having}
			ORDER BY 
				tbd.city_id,
				tbd.driver_id
			${orderPlaceholder} ${limitPlaceholder};
		`;

      countQuery = `SELECT COUNT(*) as count FROM tb_engagements eng
					LEFT JOIN tb_driver_bank_details tdbd ON
							(
									tdbd.driver_id = eng.driver_id
							)
					LEFT JOIN tb_drivers tbd ON
							(tbd.driver_id = eng.driver_id)

					LEFT JOIN tb_cities c on
							( c.city_id = tbd.city_id)

					LEFT JOIN tb_driver_wallet_number tbw ON tbw.driver_id=eng.driver_id AND tbw.status=1
					WHERE
						${subConditions}
					GROUP BY 
				eng.driver_id`;
    } else if (opts.driver_id) {
      var subConditions = '';
      if (opts.rideId) {
        subConditions += ` AND tbrp.engagement_id in(${opts.rideId})`;
      }
      if (opts.dateTime) {
        subConditions += ` AND tbrp.engagement_date >= date('${opts.dateTime}')`;
      }
      if (opts.dateTimeTo) {
        subConditions += ` AND tbrp.engagement_date <= date('${opts.dateTimeTo}')`;
      }
      if (opts.payoutStatus) {
        subConditions += ` AND tbrp.payout_status = ${opts.payoutStatus}`;
      }

      stmt = ` SELECT
					tbrp.calculated_driver_fare AS total_amount,
					(tbrp.calculated_driver_fare - tbrp.paid_by_customer ) as daily_earnings,
					tbrp.paid_by_customer,
					tbrp.net_customer_tax as tax,
					tbrp.venus_commission,
					tbrp.engagement_id,
					tbrp.current_time AS created_at,
					tdbd.name,
					tdbd.iban,
					tdbd.address,
					CASE
						WHEN oc.county_id = 3 THEN tdbd.bank_name
						ELSE tdbd.bank_type
					END AS bank_type,
					tdbd.sort_code,
					tbw.company_name,
					tbw.wallet_number,
					tbd.driver_id,
					tbd.name as driver_name,
					tbd.phone_no,
					tbd.email,
					tbd.city_id,
					a.comment,
					a.log_id,
					a.status,
					c.city_name
				    FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES} tbrp
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAIN_BANK} tdbd ON(tdbd.driver_id = tbrp.driver_id)
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} tbd ON(tbd.driver_id = tbrp.driver_id)
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY} c on
							( c.city_id = tbd.city_id)  
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY} oc ON oc.city_id=tbd.city_id
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.PAYMENT_LOGS} a on  
                    (a.eng_ref = tbrp.engagement_id and tbrp.driver_id = a.driver_ref  AND a.log_id = (
							SELECT log_id
							FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.PAYMENT_LOGS} b
							WHERE b.eng_ref = tbrp.engagement_id and tbrp.driver_id = b.driver_ref  ORDER by log_id DESC LIMIT 1
					))
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.WALLET_NUMBER} tbw ON tbw.driver_id=tbrp.driver_id AND tbw.status=1
					WHERE
					tbrp.driver_id = ${opts.driver_id} and
					tbrp.status =3
					${subConditions} ${searchPlaceholder}
					ORDER BY tbrp.engagement_id 
					${orderPlaceholder} ${limitPlaceholder}`;

      countQuery = `SELECT COUNT(*) as count FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.RIDES} tbrp
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAIN_BANK} tdbd ON(tdbd.driver_id = tbrp.driver_id)
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CAPTAINS} tbd ON(tbd.driver_id = tbrp.driver_id)
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.CITY} c on
							( c.city_id = tbd.city_id)
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.O_CITY} oc ON oc.city_id=tbd.city_id
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.PAYMENT_LOGS} a on  
                    (a.eng_ref = tbrp.engagement_id and tbrp.driver_id = a.driver_ref  AND a.log_id = (
							SELECT log_id
							FROM ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.PAYMENT_LOGS} b
							WHERE b.eng_ref = tbrp.engagement_id and tbrp.driver_id = b.driver_ref  ORDER by log_id DESC LIMIT 1
					))
					LEFT JOIN ${dbConstants.DBS.LIVE_DB}.${dbConstants.LIVE_DB.WALLET_NUMBER} tbw ON tbw.driver_id=tbrp.driver_id AND tbw.status=1
					WHERE
					tbrp.driver_id = ${opts.driver_id} and
					tbrp.status =3
					${subConditions}`;
    } else {
      throw new Error('Parameters Missing');
    }

    let payoutData = await db.RunQuery(dbConstants.DBS.LIVE_DB, stmt, []);
    let payoutDataCount = await db.RunQuery(
      dbConstants.DBS.LIVE_DB,
      countQuery,
      [],
    );

    var response = {
      data: payoutData,
      iTotalRecords: payoutData.length,
      iTotalDisplayRecords: payoutDataCount.length,
    };

    return responseHandler.success(req, res, 'User Details Sents', response);
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
