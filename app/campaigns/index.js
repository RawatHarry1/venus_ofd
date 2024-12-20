const PromotionsController = require('./controllers/promotions');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.get(
    '/fetch_promos',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.promotionList,
  );
  app.post(
    '/insert_promo',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.insertPomotions,
  );
  app.post(
    '/create_auth_promotion',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.createAuthPromo,
  );
};
