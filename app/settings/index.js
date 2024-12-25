const VehicleController = require('./controllers/vehilces');
const AdminMiddlewares = require('../admin/middelware');
const CitiesController = require('./controllers/cities')
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
};
