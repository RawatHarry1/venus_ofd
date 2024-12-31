const RidesController = require('./controllers/rides');
const vehicleTypesController = require('./controllers/vehicle');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {

  /**
   * Rides
  **/
  app.get(
    '/get_ride_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    RidesController.getRides,
  );

  app.get(
    '/get_scheduled_ride_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    RidesController.getScheduledRideDetails,
  );

  app.get(
    '/get_unaccepted_ride_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    RidesController.getUnacceptedRideRequestUserDetails,
  );

  /**
   * VehicleTypes
  **/
  app.get(
    '/get_city_info_operator_wise',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    vehicleTypesController.get_city_info_operator_wise,
  );
  // app.get(
  //   '/fetch_vehicles',
  //   AdminMiddlewares.admin.isLoggedIn,
  //   AdminMiddlewares.admin.domainToken,
  //   vehicleTypesController.fetchVehicles,
  // );
  app.get(
    '/fetch_vehicle_make',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    vehicleTypesController.fetchVehicleMake,
  );


/**
  * Graph
**/
  app.post(
    '/analytics/data_aggregation',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    RidesController.dataAggregation,
  );


  /**
   * Global Search Rides
  **/
  app.post(
    '/schedule-ride-auth/get_engagement_info',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.city.getEngagementInfo,
    RidesController.getEngagementInfo,
  );
};
