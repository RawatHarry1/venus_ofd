const RidesController = require('./controllers/rides');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.get(
    '/get_ride_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    RidesController.getRides,
  );
};
