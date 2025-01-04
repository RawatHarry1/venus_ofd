const CaptainController = require('./controllers/captainRegistration');
const CaptainDetail = require('./controllers/captainDetails');
const PayoutController = require('./controllers/payout');
const customerController = require('./controllers/customerDetails');
const AdminMiddlewares = require('../admin/middelware');
var multer = require('multer');
const { generalConstants } = require('../../bootstart/header');

var upload = multer({
  dest: 'uploads/',
  limits: { fileSize: generalConstants.MAX_ALLOWED_FILE_SIZE },
});

module.exports = function (app) {
  app.post(
    '/v2/get_self_enrolled_drivers',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainController.getCaptainEnrollment,
  );

  app.get(
    '/active_driver_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getCaptains,
  );

  app.get(
    '/get_driver_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getCaptionsDetails,
  );

  app.post(
    '/get_payout_info',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PayoutController.getPayouts,
  );

  app.post(
    '/v2/upload_document',
    upload.single('image'),
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.uploadDocument_v2,
  );

  app.post(
    '/v2/get_driver_document_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getDriverDocumentDetails_v2,
  );

  app.post(
    '/v2/updateDocumentStatus',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.updateDocumentStatus_v2,
  );

  /**
   * Global Search Driver
   **/

  app.post(
    '/schedule-ride-auth/driver_info',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.city.getDriverInfo,
    CaptainDetail.getDriverInfo,
  );

  /**
   * Global Search Customer
   **/
  app.post(
    '/schedule-ride-auth/get/user_details',
    AdminMiddlewares.admin.isLoggedIn,
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.city.getDetailsForUser,
    customerController.get_details_for_user,
  );
  app.get(
    '/fetch/available_drivers',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    CaptainDetail.getAvilableDrivers,
  );
};
