const shuttleRoute = require('./controllers/shuttleRoute');
const busesRoutes = require('./controllers/busesRoutes');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {

  /* 
  Routes cruds for Shuttle
  */
  app.post(
    '/internal/insert_route',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.insertRoute,
  );
  app.get(
    '/internal/fetch_routes',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.fetchRouteList,
  );

  app.post(
    '/internal/edit_route',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.editRoute,
  );

  app.post(
    '/internal/delete_route',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.deleteRoute,
  );

  /* 
  Vehicles Buses Routes
  */
  app.get(
    '/internal/vehicle_make_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    busesRoutes.fetchVehicleMakeDetails,
  );

  app.get(
    '/internal/fetch_vehicle_buses',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    busesRoutes.fetchVehicleBuses,
  );

  /* 
  Bus Assigning to Driver Routes
  */
  app.post(
    '/internal/assign_bus_to_driver',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    busesRoutes.assignBusToDriver,
  );

  app.get(
    '/internal/fetch_booked_buses',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    busesRoutes.fetchBookedBuses,
  );
};
