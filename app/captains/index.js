const CaptainController = require('./controllers/captainRegistration');
const CaptainDetail = require('./controllers/captainDetails');
const PayoutController = require('./controllers/payout');
const customerController = require('./controllers/customerDetails')
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.post(
    '/v2/get_self_enrolled_drivers',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainController.getCaptainEnrollment,
  );

  app.get(
    '/active_driver_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getCaptains,
  );

  app.get(
    '/get_driver_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getCaptionsDetails,
  );

  app.post(
    '/get_payout_info',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PayoutController.getPayouts,
  );

  /**
   * Global Search Driver
  **/

  app.post(
    '/schedule-ride-auth/driver_info',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getDriverInfo,
  );


  /**
   * Global Search Customer
  **/
    app.post(
      '/schedule-ride-auth/get/user_details',
      AdminMiddlewares.admin.isLoggedIn,
      AdminMiddlewares.admin.domainToken,
      AdminMiddlewares.city.getDetailsForUser,
      customerController.get_details_for_user,
    );
  
};
