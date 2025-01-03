const ClientsDetails = require('./controllers/clientsDetails');
const Payment = require('./controllers/payment.js');
const AdminMiddlewares = require('../admin/middelware');

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

};
