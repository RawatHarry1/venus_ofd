const RidesController = require('./controllers/rides');
const vehicleTypesController = require('./controllers/vehicle');
const AdminMiddlewares = require('../admin/middelware');
const PackageTypesController = require('./controllers/package');
var multer = require('multer');
const { generalConstants } = require('../../bootstart/header');
var createRideController = require('./controllers/createRide');

var upload = multer({
  dest: 'uploads/',
  limits: { fileSize: generalConstants.MAX_ALLOWED_FILE_SIZE },
});

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
  // app.get(
  //   '/get_city_info_operator_wise',
  //   AdminMiddlewares.admin.isLoggedIn,
  //   AdminMiddlewares.admin.domainToken,
  //   vehicleTypesController.get_city_info_operator_wise,
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

  /**
   * Package Type Routes
   **/
  app.get(
    '/internal/fetch_package_type',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    PackageTypesController.fetchPackageTypes,
  );

  app.get(
    '/internal/fetch_packages',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    PackageTypesController.fetchPackages,
  );

  app.post(
    '/upload_file_customer',
    upload.single('image'),
    PackageTypesController.uploadFileController,
  );

  /**
   * Create Rides
   **/

  app.post('/getFareEstimate', createRideController.findAvailableDrivers);

  app.post(
    '/api/v1/request_ride',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.bussinessMiddlewares.fetchTokenUsingPhoneNo,
    createRideController.requestRideThroughBusinessUser,
  );

  app.post(
    '/api/v1/fare_estimate',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.bussinessMiddlewares.fetchTokenUsingPhoneNo,
    createRideController.fareEstimateThroughBusinessUser,
  );

  app.post(
    '/api/v1/schedule_ride',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.bussinessMiddlewares.fetchTokenUsingPhoneNo,
    createRideController.scheduleRideThroughBusinessUser,
  );

  app.post(
    '/cancel_ride_v2',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    createRideController.cancelRideFromPanelV2,
  );

  app.post(
    '/customer/assign_driver_to_schedule_ride',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    createRideController.assignDriverToScheduleRide,
  );

  app.post(
    '/remove_pickup_schedule',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    createRideController.removePickupSchedule,
  );

  app.post(
    '/customer/reassign_driver',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    createRideController.reAssignDriver,
  );
};
