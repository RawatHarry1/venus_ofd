const {
  dbConstants,
  db,
  errorHandler,
  responseHandler,
  ResponseConstants,
  rideConstants,
  documentsConstants,
} = require('../../../bootstart/header');

const Helper = require('../helper');
var Joi = require('joi');
const { checkBlank } = require('../../rides/helper');
const globalHelper = require('../globalHelper');

/**
 * Global Search Customer
 **/
exports.get_details_for_user = async function (req, res) {
  try {
    if (req.method == 'POST') {
      var user_id = req.body.user_id;
    } else if (req.method == 'GET') {
      // we are ovewriting user_id by auth_user_id if he is vendor
      var user_id = req.query.user_id;
      var foundInAutos = req.query.user_info;
    }

    var authUserId = req.body.authUserId;

    var checkValues = checkBlank([user_id]);
    var response;
    if (checkValues == 1) {
      return responseHandler.parameterMissingResponse(res, '');
    }
    if (!req.body.paginationDetails) {
      return responseHandler.parameterMissingResponse(res, '');
    }

    var token = req.body.token;
    var sf_recentRides =
      parseInt(req.body.paginationDetails.sf_recentRides) || 0;
    var sf_couponsData =
      parseInt(req.body.paginationDetails.sf_couponsData) || 0;
    var sf_txnDetails = parseInt(req.body.paginationDetails.sf_txnDetails) || 0;
    var sf_promotionsApplicable =
      parseInt(req.body.paginationDetails.sf_promotionsApplicable) || 0;
    var sf_userIssues = parseInt(req.body.paginationDetails.sf_userIssues) || 0;
    var sf_cancelledRides =
      parseInt(req.body.paginationDetails.sf_cancelledRides) || 0;
    var ps_recentRides =
      parseInt(req.body.paginationDetails.ps_recentRides) || 10;
    var ps_couponsData =
      parseInt(req.body.paginationDetails.ps_couponsData) || 10;
    var ps_txnDetails =
      parseInt(req.body.paginationDetails.ps_txnDetails) || 10;
    var ps_promotionsApplicable =
      parseInt(req.body.paginationDetails.ps_promotionsApplicable) || 10;
    var ps_userIssues =
      parseInt(req.body.paginationDetails.ps_userIssues) || 10;
    var ps_cancelledRides =
      parseInt(req.body.paginationDetails.ps_cancelledRides) || 10;
    var sf_freshRead = parseInt(req.body.paginationDetails.sf_freshRead) || 0;
    var ps_freshRead = parseInt(req.body.paginationDetails.ps_freshRead) || 10;
    var sf_walletTxns = parseInt(
      req.body.paginationDetails.sf_mobikwikTxns || 0,
    );
    var ps_walletTxns = parseInt(
      req.body.paginationDetails.ps_mobikwikTxns || 20,
    );
    var sf_mealsRead = parseInt(req.body.paginationDetails.sf_mealsRead || 0);
    var ps_mealsRead = parseInt(req.body.paginationDetails.ps_mealsRead || 10);
    var sf_groceryRead = parseInt(
      req.body.paginationDetails.sf_groceryRead || 0,
    );
    var ps_groceryRead = parseInt(
      req.body.paginationDetails.ps_groceryRead || 10,
    );
    var sf_deductMoneyTxns = parseInt(
      req.body.paginationDetails.sf_deductMoneyTxns || 10,
    );
    var ps_deductMoneyTxns = parseInt(
      req.body.paginationDetails.ps_deductMoneyTxns || 10,
    );
    var sf_menusRead = parseInt(req.body.paginationDetails.sf_menusRead || 0);
    var ps_menusRead = parseInt(req.body.paginationDetails.ps_menusRead || 10);
    var sf_deliveryRead = parseInt(
      req.body.paginationDetails.sf_deliveryRead || 0,
    );
    var ps_deliveryRead = parseInt(
      req.body.paginationDetails.ps_deliveryRead || 10,
    );
    var sf_menuCoupons = parseInt(
      req.body.paginationDetails.sf_menuCoupons || 0,
    );
    var ps_menuCoupons = parseInt(
      req.body.paginationDetails.ps_menuCoupons || 10,
    );
    var sf_freshCoupons = parseInt(
      req.body.paginationDetails.sf_freshCoupons || 0,
    );
    var ps_freshCoupons = parseInt(
      req.body.paginationDetails.ps_freshCoupons || 10,
    );
    var sf_mealsCoupons = parseInt(
      req.body.paginationDetails.sf_mealsCoupons || 0,
    );
    var ps_mealsCoupons = parseInt(
      req.body.paginationDetails.ps_mealsCoupons || 10,
    );

    var isAutosUser = req.body.isAutosUser;
    var isVendor = req.body.isVendor;
    var verificationStatus = req.body.verificationStatus;
    var keyType = req.body.keyType;

    var pickup_times = [];
    var driver_names = [];
    var ride_distances = [];
    var ride_times = [];
    var amounts = [];
    var payment_modes = [];
    var account_numbers = [];
    var coupon_titles = [];
    var paid_by_customer = [];
    var discount = [];
    var remaining_coup = [];
    var engagement_ids = [];

    var added_on = [];
    var redeemed_on = [];
    var expiry_date = [];
    var reasons = [];
    var promo_titles = [];
    var coupon_types = [];
    var coupon_status = [];

    var time_transaction = [];
    var amounts_transaction = [];
    var debit_state = [];
    var reason_transaction = [];
    var account_balance = [];
    var user_name = [];
    var user_email = [];
    var user_phone_no = [];
    var user_is_blocked = [];
    var user_can_request = [];
    var user_city = [];
    var deviceName = [];
    var osVersion = [];
    var appVersionCode = [];
    var ref_code = [];
    var user_ref_code = [];
    var friends_details = [];
    var app_id = [];
    var driverIds = [];
    var paid_using_paytm = [];
    var paid_using_mobikwik = [];
    var paid_using_freecharge = [];
    var amount_venus_wallet = [];
    var driver_fare_factor = [];
    var customer_fare_factor = [];
    var preferred_payment_mode = [];
    var asyncTasks = [];
    var rideRating = [];
    var paytm_enabled = {};
    var ongoinRide = [];
    var user_debt = [];
    var referrer = [];
    var dup_reg = [];
    var block_reason = [];
    var block_reason_text = [];
    var date_registered = [];
    var issues = [];
    var invalid_device_count = [];
    var cancelledRides = [];
    var firstRideCity = [];
    var detailsCountArr = [];
    var actualUserDebt = [];
    var userSubscription = [];
    var convenience_charge = [];
    var convenience_charge_waiver = [];
    var ride_source = [];
    var ride_type = [];
    var isStartEnd = [];
    var isStartEndReversed = [];
    var isStartEndAutomated = [];
    var userCategory = [];
    var startEndCount = [];
    var isDeactivated = [];
    var deactivationReason = [];
    var dateOfBirth = [];
    var balanceWrapper = {};
    var deductMoneyTxns = [];
    var paytmBalanceWrapper = {};
    var mobikwikBalanceWrapper = {};
    var ordersData = {};
    var freshAnyWhereData = {};
    var mealsData = {};
    var groceryData = {};
    var menusData = {};
    let user_notes = {};

    var menusCouponsAddedOn = [];
    var menusCouponsRedeemedOn = [];
    var menusCouponsExpiryDate = [];
    var menusCouponsStatus = [];
    var menusCouponsCouponTitle = [];
    var menusCouponsReason = [];
    var freshCouponsAddedOn = [];
    var freshCouponsRedeemedOn = [];
    var freshCouponsExpiryDate = [];
    var freshCouponsStatus = [];
    var freshCouponsCouponTitle = [];
    var freshCouponsReason = [];
    var freshCouponsMaxBenefit = [];
    var mealsCouponsAddedOn = [];
    var mealsCouponsRedeemedOn = [];
    var mealsCouponsExpiryDate = [];
    var mealsCouponsStatus = [];
    var mealsCouponsCouponTitle = [];
    var mealsCouponsReason = [];
    var mealsCouponsMaxBenefit = [];

    var menusCouponsMaxBenefit = [];
    var isDriver = 0;

    var today = new Date();
    var date =
      today.getFullYear() +
      '-' +
      (today.getMonth() + 1) +
      '-' +
      today.getDate();
    var prevDate = new Date(date);
    prevDate.setFullYear(prevDate.getFullYear() - 1);
    prevDate =
      prevDate.getFullYear() +
      '-' +
      (prevDate.getMonth() + 1) +
      '-' +
      prevDate.getDate();
    var allTransactions = [];
    var deliveryInfo = [];
    var businessInfo = {};
    var couponsData = {};
    var availablePromotions = {};

    // these functions will always be called,using auth_user_id or user_id on basis of whether he is vendor or not
    await globalHelper.getWalletTransactions(
      user_id,
      authUserId,
      allTransactions,
      sf_walletTxns,
      ps_walletTxns,
    );
    await globalHelper.get_transaction_details(
      app_id,
      time_transaction,
      amounts_transaction,
      debit_state,
      account_balance,
      reason_transaction,
      user_id,
      authUserId,
      user_name,
      user_email,
      user_phone_no,
      user_is_blocked,
      user_can_request,
      user_city,
      user_debt,
      block_reason,
      block_reason_text,
      date_registered,
      deviceName,
      osVersion,
      appVersionCode,
      userCategory,
      isDeactivated,
      deactivationReason,
      dateOfBirth,
      sf_txnDetails,
      ps_txnDetails,
    );
    await globalHelper.get_user_ref_code_used(
      ref_code,
      user_ref_code,
      referrer,
      user_id,
      authUserId,
    );
    await globalHelper.get_paytm_enabled(user_id, authUserId, paytm_enabled);
    await globalHelper.get_dup_reg(user_id, authUserId, dup_reg);
    await globalHelper.get_invalid_devices(
      user_id,
      authUserId,
      invalid_device_count,
    ),
      //    await globalHelper.getUserDebt(user_id, authUserId, actualUserDebt),
      await globalHelper.getCustomerNotes(user_id, user_notes);

    // If user is autos, add additional tasks
    if (isAutosUser) {
      await globalHelper.getRidesData(
        discount,
        paid_by_customer,
        pickup_times,
        driver_names,
        ride_distances,
        ride_times,
        amounts,
        payment_modes,
        account_numbers,
        coupon_titles,
        engagement_ids,
        user_id,
        driverIds,
        paid_using_paytm,
        paid_using_mobikwik,
        paid_using_freecharge,
        amount_venus_wallet,
        convenience_charge,
        convenience_charge_waiver,
        ride_source,
        ride_type,
        isStartEnd,
        isStartEndReversed,
        isStartEndAutomated,
        rideRating,
        sf_recentRides,
        ps_recentRides,
      );
      await globalHelper.getCouponsData(
        user_id,
        sf_couponsData,
        ps_couponsData,
        couponsData,
      );
      await globalHelper.get_user_remaining_coupons(user_id, remaining_coup),
        await globalHelper.get_promotions_applicable(
          promo_titles,
          customer_fare_factor,
          driver_fare_factor,
          preferred_payment_mode,
          user_id,
          sf_promotionsApplicable,
          ps_promotionsApplicable,
        ),
        await globalHelper.get_friends_details(user_id, friends_details),
        await globalHelper.getOngoingRide(user_id, ongoinRide),
        //     globalHelper.getIssuesForUser(user_id, issues, sf_userIssues, ps_userIssues),
        await globalHelper.getCancelledRides(
          user_id,
          cancelledRides,
          sf_cancelledRides,
          ps_cancelledRides,
          1,
        ),
        await globalHelper.getFirstRideCity(user_id, firstRideCity);
      //     globalHelper.getUserSubscription(user_id, userSubscription),
      //     globalHelper.StartEnd.getStartEndCasesCount(user_id, startEndCount, isDriver),
      //     globalHelper.fetchPaytmBalance(user_id, balanceWrapper),
      //     globalHelper.getUserDeductMoneyLogs(user_id, deductMoneyTxns, sf_deductMoneyTxns, ps_deductMoneyTxns),
      await globalHelper.get_promotions(
        availablePromotions,
        user_id,
        sf_promotionsApplicable,
        ps_promotionsApplicable,
      );
    }

    detailsCountArr[0] = exports.detailsUserCount;
    // check for cancellation rides refund status
    var userCategoryNumber = userCategory[0];
    var cancellationRefund = -1;

    cancellationRefund = rideConstants.CANCELLATION_REFUND.ON_COMPLAINT;

    // check for user city null
    if (user_city[0] == 0 || !user_city[0]) {
      user_city[0] = firstRideCity[0];
    }
    var recent_rides = [],
      transactions = [],
      coupons = [],
      friends = [];

    var remaining_coupons = remaining_coup[0];

    // Rides table
    if (pickup_times.length != 0) {
      for (var j = 0; j < pickup_times.length; j++) {
        var cash = payment_modes[j];
        if (cash == 2) {
          cash = 'Y';
          if (paid_by_customer[j] > 0) {
            cash = 'P';
          }
        } else cash = 'N';
        var free = account_numbers[j];
        var coupon_title;
        if (free > 0) {
          free = 'Y';
          coupon_title = coupon_titles[j];
        } else {
          free = 'N';
          coupon_title = 'NA';
        }
        recent_rides.push({
          'Date Time': pickup_times[j],
          'Driver Name': rideRating[j].Dname, // driver_names[j],
          'Ride Distance': ride_distances[j],
          'Ride Time': ride_times[j],
          Amount: amounts[j] - discount[j],
          'Amount Jungoo Wallet': amount_venus_wallet[j],
          'Paid in Cash': paid_by_customer[j],
          'Venus cash(Y/N)': cash,
          'Coupon Used(Y/N)': free,
          'Coupon Title': coupon_title,
          'Promotion Title': promo_titles[j],
          'Engagement ID': engagement_ids[j],
          'Driver ID': driverIds[j],
          'Paid Using Paytm': paid_using_paytm[j],
          'Paid Using Mobikwik': paid_using_mobikwik[j],
          'Paid Using Freecharge': paid_using_freecharge[j],
          'Customer Fare Factor': customer_fare_factor[j],
          'Driver Fare Factor': driver_fare_factor[j],
          'Preferred Payment Mode': preferred_payment_mode[j],
          'Convenience Charge': convenience_charge[j],
          'Convenience Charge Waiver': convenience_charge_waiver[j],
          'Ride Source': ride_source[j],
          'Ride Type': ride_type[j],
          'Start End': isStartEnd[j],
          'Start End Reversed': isStartEndReversed[j],
          'Start End Automated': isStartEndAutomated[j],
          'User Rating': rideRating[j].user_rating,
          'Driver Rating': rideRating[j].driver_rating,
        });
      }
    }

    // Transaction Table
    if (time_transaction.length != 0) {
      for (var j = 0; j < time_transaction.length; j++) {
        var state = debit_state[j];
        if (state == 1 || state == 14 || state == 15) state = 'C';
        else if (state == 3) state = 'CB';
        else if (state == 4) state = 'DAC';
        else if (state == 5) state = 'Ride_Can';
        else if (state == 6) state = 'Ref_Gift';
        else if (state == 7) state = 'Ref_Bon';
        else if (state == 8) state = 'Refund';
        else if (state == 9) state = 'Prom_Gift';
        else if (state == 10) state = 'Gift';
        else state = 'D';
        transactions.push({
          'Transaction Time': time_transaction[j],
          Amount: amounts_transaction[j],
          'Debit/Credit/CashBack/Driver Added Cash(D/C/CB/DAC)': state,
          Reason: reason_transaction[j],
          Application: app_id[j],
        });
      }
    }

    // Friends Details
    if (friends_details.length != 0) {
      for (var i = 0; i < friends_details.length; i++) {
        friends.push({
          'User Id': friends_details[i].user_id,
          'User Name': friends_details[i].user_name,
          'Email Id': friends_details[i].user_email,
          'Phone No': friends_details[i].phone_no,
          'Made Transaction On': friends_details[i].first_transaction_on,
          'Verification Status': friends_details[i].verification_status,
          'Is Duplicate': friends_details[i].is_duplicate,
          'Date Registered': friends_details[i].date_registered,
          'Failed Reason': friends_details[i].failed_reason,
          Type: friends_details[i].type,
        });
      }
    }
    var menuCoupons = [];
    if (menusCouponsAddedOn.length != 0) {
      for (var i = 0; i < menusCouponsAddedOn.length; i++) {
        menuCoupons.push({
          'Given On': menusCouponsAddedOn[i],
          'Redeemed On': menusCouponsRedeemedOn[i],
          'Expiry Date': menusCouponsExpiryDate[i],
          Status: menusCouponsStatus[i],
          'Coupon Title': menusCouponsCouponTitle[i],
          Reason: menusCouponsReason[i],
          MaxBenefit: menusCouponsMaxBenefit[i],
        });
      }
    }
    var freshCoupons = [];
    if (freshCouponsAddedOn.length != 0) {
      for (var i = 0; i < freshCouponsAddedOn.length; i++) {
        freshCoupons.push({
          'Given On': freshCouponsAddedOn[i],
          'Redeemed On': freshCouponsRedeemedOn[i],
          'Expiry Date': freshCouponsExpiryDate[i],
          Status: freshCouponsStatus[i],
          'Coupon Title': freshCouponsCouponTitle[i],
          Reason: freshCouponsReason[i],
          MaxBenefit: freshCouponsMaxBenefit[i],
        });
      }
    }
    var mealsCoupons = [];
    if (mealsCouponsAddedOn.length != 0) {
      for (var i = 0; i < mealsCouponsAddedOn.length; i++) {
        mealsCoupons.push({
          'Given On': mealsCouponsAddedOn[i],
          'Redeemed On': mealsCouponsRedeemedOn[i],
          'Expiry Date': mealsCouponsExpiryDate[i],
          Status: mealsCouponsStatus[i],
          'Coupon Title': mealsCouponsCouponTitle[i],
          Reason: mealsCouponsReason[i],
          MaxBenefit: mealsCouponsMaxBenefit[i],
        });
      }
    }

    var responseData = {
      freshData: freshAnyWhereData.freshAnyWhereData,
      'Paytm Enabled': paytm_enabled.enabled,
      'Mobikwik Enabled': paytm_enabled.mobikwik_enabled,
      'Freecharge Enabled': paytm_enabled.freecharge_enabled,
      'Ongoing Ride': ongoinRide,
      user_debt: actualUserDebt[0],
      'User Subscription': userSubscription[0],
      'Referred By': referrer[0],
      DuplicateReg: dup_reg[0],
      'Date Registered': date_registered[0],
      issues: issues,
      detailsCount: detailsCountArr[0],
      start_end_count: startEndCount[0],
      paytm_balance: balanceWrapper.paytm_balance,
      mobikwik_balance: balanceWrapper.mobikwik_balance,
      remaining_coupons: remaining_coupons,
      ref_code: ref_code[0],
      user_ref_code: user_ref_code[0],
      user_name: user_name[0],
      user_status: user_name[1],
      user_image: user_name[2],
      user_email: user_email[0],
      user_city: user_city[0],
      device_name: deviceName[0],
      os_version: osVersion[0],
      app_version: appVersionCode[0],
      user_id: user_id,
      phone_no: user_phone_no[0],
      is_blocked: user_is_blocked[0],
      can_request: user_can_request[0],
      account_balance: account_balance[0],
      recent_rides: recent_rides,
      cancelled_rides: cancelledRides,
      transactions: transactions,
      allTransactions: allTransactions,
      coupons: couponsData.couponData || [],
      friends: friends,
      mealsData: mealsData.userOrders,
      groceryData: groceryData.userOrders,
      freecharge_balance: balanceWrapper.freecharge_balance,
      cancellationRefund: cancellationRefund,
      is_deactivated: isDeactivated[0],
      deactivation_reason: deactivationReason[0],
      date_of_birth: dateOfBirth[0],
      deduct_money_txns: deductMoneyTxns,
      menusData: menusData.menuOrders,
      isVendor: isVendor,
      menuCoupons: menuCoupons,
      freshCoupons: freshCoupons,
      mealsCoupons: mealsCoupons,
      availablePromotions: availablePromotions,
      user_notes: user_notes.user_notes,
    };

    if (isVendor) {
      responseData['businessName'] = businessInfo.business_name;
      responseData['vendorId'] = businessInfo.vendor_id;
      responseData['is_menus_enabled'] = businessInfo.is_menus_enabled;
      if (deliveryInfo.length != 0) {
        responseData['vendorInfo'] = deliveryInfo;
      }
    }

    if (user_can_request[0] == 0) {
      responseData.blockReason =
        block_reason[0] != null ? block_reason[0] : 'Reason not found';
      responseData.blockReasonText = block_reason_text[0] || 'Reason not found';
    }

    if (invalid_device_count[0] > 0) {
      responseData['referral_fail_reason'] =
        'Not given because of invalid device';
    }

    return responseHandler.success(
      req,
      res,
      'Data fetched successfully.',
      responseData,
    );
  } catch (error) {
    errorHandler.errorHandler(error, req, res);
  }
};
