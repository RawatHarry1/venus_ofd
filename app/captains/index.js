const CaptainController = require('./controllers/captainRegistration');
const CaptainDetail = require('./controllers/captainDetails');
const PayoutController = require('./controllers/payout');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.post(
    '/v2/get_self_enrolled_drivers',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainController.getCaptainEnrollment,
  );

  app.post(
    '/active_driver_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getCaptains,
  );

  app.post(
    '/get_payout_info',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PayoutController.getPayouts,
  );
};
