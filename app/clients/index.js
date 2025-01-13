const ClientsDetails = require('./controllers/clientsDetails');
const Payment = require('./controllers/payment.js');
const AdminMiddlewares = require('../admin/middelware');
var multer = require('multer');
const { generalConstants } = require('../../bootstart/header.js');

var upload = multer({
  dest: 'uploads/',
  limits: { fileSize: generalConstants.MAX_ALLOWED_FILE_SIZE },
});

module.exports = function (app) {
  app.get(
    '/customer_details',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    ClientsDetails.getClients,
  );

  app.post(
    '/is_user_present',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    ClientsDetails.isUserPresent,
  );
  app.get(
    '/get_customers',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    ClientsDetails.getCustomers,
  );

  app.get(
    '/get_user_credit_logs',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    Payment.getUserCreditLogs,
  );

  /* 
  Customer Create API's
  */

  app.post(
    '/customer/sendLoginOtp',
    AdminMiddlewares.admin.isLoggedIn,
    ClientsDetails.sendLoginOtp,
  );

  app.post(
    '/customer/verifyOtp',
    AdminMiddlewares.admin.isLoggedIn,
    ClientsDetails.verifyOtp,
  );

  app.put(
    '/customer/profile',
    upload.single('updatedUserImage'),
    AdminMiddlewares.admin.isLoggedIn,
    ClientsDetails.createCustomerProfile,
  );
};
