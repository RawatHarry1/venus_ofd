const RidesController = require('./controllers/rides');
const vehicleTypesController = require('./controllers/vehicle')
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.get(
    '/get_ride_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    RidesController.getRides,
  );
  app.get(
    '/get_city_info_operator_wise',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    vehicleTypesController.get_city_info_operator_wise,
  );
  app.get(
    '/fetch_vehicles',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    vehicleTypesController.fetchVehicles,
  );
  app.get(
    '/fetch_vehicle_make',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    vehicleTypesController.fetchVehicleMake,
  );

  app.post(
    '/analytics/data_aggregation',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    RidesController.dataAggregation,
  );
};
