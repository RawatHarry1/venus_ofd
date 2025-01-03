const ClientsDetails = require('./controllers/clientsDetails');
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
};
