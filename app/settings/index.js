const VehicleController = require('./controllers/vehilces');
const AdminMiddlewares = require('../admin/middelware');
const CitiesController = require('./controllers/cities');
const fareSettingsController = require('./controllers/fareSettings');
const documentSettingsController = require('./controllers/document');
const polygonController = require('./controllers/polygon');
const bannersController = require('./controllers/banners');
const tollsController = require('./controllers/toll');

var multer = require('multer');
const { generalConstants } = require('../../bootstart/header');

var upload = multer({
  dest: 'uploads/',
  limits: { fileSize: generalConstants.MAX_ALLOWED_FILE_SIZE },
});

module.exports = function (app) {
  /* 
  Global settings API's
  */
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

  /* 
  Vehicle fare settings API's
  */
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
    '/internal/insert_operator_vehicle_type',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.insertOperatorVehicleType,
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
    '/internal/update_vehicle_images_fares',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.updateVehicleImagesNfares,
  );

  app.post(
    '/internal/update_operator_fares',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.insertUpdatedFareLogs,
  );

  app.get(
    '/fetch_available_vehicles',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.fetchAvailableVehicles,
  );

  app.post(
    '/internal/fetch_radius_or_eta',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.fetchRadiusOrEta,
  );

  app.post(
    '/internal/update_tb_request_radius',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    fareSettingsController.updateTbRequestRadius,
  );

  /* 
  Document settings API's
  */

  app.post(
    '/insert_document',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.documents.checkMultipleVehicleEnableHelper,
    documentSettingsController.insertDocument,
  );

  app.get(
    '/fetchCityDocuments',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.city.exec,
    documentSettingsController.fetchCityDocuments,
  );

  app.post(
    '/update_document',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    documentSettingsController.updateDocument,
  );

  /* 
  Polygon settings API's
  */
  app.get(
    '/fetch_polygon',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.city.checkUserLevel,
    polygonController.fetchPolygon,
  );

  app.post(
    '/update_polygon',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.city.checkUserLevel,
    polygonController.updatePolygon,
  );

  /* 
  Banners settings API's
  */
  app.post(
    '/internal/create_banner_type',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.createBannerType,
  );

  app.post(
    '/internal/upload_logo_to_s3',
    upload.single('file'),
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.uploadLogoToS3,
  );

  app.get(
    '/internal/fetch_banner_types',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.fetchBannerTypes,
  );

  app.post(
    '/internal/update_banner_type',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.updateBannerType,
  );

  app.post(
    '/internal/delete_banner_type',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.deleteBannerType,
  );

  app.post(
    '/internal/create_banner',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.createBanner,
  );
  app.get(
    '/internal/fetch_banners',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.fetchBanners,
  );
  app.post(
    '/internal/update_banner',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.updateBanner,
  );
  app.post(
    '/internal/delete_banner',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    bannersController.deleteBanner,
  );

  /* 
  Toll API's
 */
  app.post(
    '/getTolls',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    tollsController.getTolls,
  );

  app.post(
    '/insertToll',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    tollsController.insertToll,
  );
};
