const PushNotifcationController = require('./controllers/pushNotification');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  /* 
  Driver Push Notification
  */
  app.post(
    '/sendSmsToDriver',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PushNotifcationController.sendSmsPushToDriver,
  );

  /* 
  Customer Push Notification
  */

  app.post(
    '/contact_customers',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PushNotifcationController.contactCustomers,
  );
};
