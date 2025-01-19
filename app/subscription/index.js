const SubscriptionController = require('./controllers/subscription');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {

/**
 * Subscription APIS
*/
  app.get(
    '/fetch_All_subscriptions',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    SubscriptionController.fetchAllSubscriptions,
  );
  app.post(
    '/create_subscription',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    SubscriptionController.createSubscription,
  );

  app.post(
    '/update_subscription',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    SubscriptionController.updateSubscription,
  );

  app.post(
    '/delete_subscription',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    SubscriptionController.deleteSubscription,
  );
};
