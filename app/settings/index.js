const VehicleController = require('./controllers/vehilces');
const AdminMiddlewares = require('../admin/middelware');
const CitiesController = require('./controllers/cities')
const fareSettingsController = require('./controllers/fareSettings')
var multer       =     require('multer');
const { generalConstants } = require('../../bootstart/header');



var upload       =     multer({dest : 'uploads/', limits: { fileSize: generalConstants.MAX_ALLOWED_FILE_SIZE }});

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
    '/fetch/operator/city/fields',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.useControlPanelApi,
    CitiesController.fetchOprCitiesFields,
  );

  app.post(
    '/update/operator/city/fields',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.useControlPanelApi,
    CitiesController.updateTbOperatorCities,
  );

  app.post(
    '/add_vehicle_make',
    upload.single('file'),
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CitiesController.addVehicleMake,
  );

  app.post(
    '/update_vehicle_make',
    upload.single('file'),
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CitiesController.updateVehicleMake,
  );

  app.post(
    '/internal/fetch_operator_vehicle_type',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.fetchOperatorVehicleType,
  );

  app.post(
    '/internal/update_operator_vehicle_type',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.updateOperatorVehicleType,
  );

  app.get(
    '/fetch_vehicle_set',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.fetchVehicleSet,
  );

  app.post(
    '/internal/fetch_operator_request_radius',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.fetchOperatorRequestRadius,
  );

  app.post(
    '/internal/update_operator_request_radius',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.updateOperatorRequestRadius,
  );

  app.post(
    '/internal/fetch_vehicle_images_fares',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.fetchVehicleImagesNfares,
  );

  app.post(
    '/internal/update_operator_fares',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.insertUpdatedFareLogs,
  );
};
