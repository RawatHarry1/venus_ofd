const VehicleController = require('./controllers/vehilces');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.get(
    '/fetch_vehicles',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    VehicleController.fetchVehicles,
  );
  app.get(
    '/get_city_info_operator_wise',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    VehicleController.operatorCityInfo,
  );
  app.post(
    '/internal/fetch_operator_vehicle_type',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    VehicleController.fetchOperatorVehicleType,
  );
  app.post(
    '/internal/update_operator_fares',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    VehicleController.insertUpdatedFareLogs,
  );
};
