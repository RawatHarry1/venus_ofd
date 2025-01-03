const Referral = require('./controllers/referral');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.post(
    '/update_operator_city_referral',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    Referral.updatedOperatorCityReferral,
  );
};
