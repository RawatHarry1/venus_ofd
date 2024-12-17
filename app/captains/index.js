const CaptainController = require('./controllers/driverRegistration');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.post(
    '/v2/get_self_enrolled_drivers',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainController.getCaptains,
  );
};
