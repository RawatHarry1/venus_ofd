const PromotionsController = require('./controllers/promotions');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  /* 
  Fetch PromoCodes and coupons
  */
  app.get(
    '/fetch_promos',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.promotionList,
  );

  /* 
  Global PromoCodes
  */
  app.post(
    '/insert_promo',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.insertPomotions,
  );

  app.post(
    '/edit_promo',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.editPromo,
  );

  /* 
  Auth PromoCodes
  */
  app.post(
    '/create_auth_promotion',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.createAuthPromo,
  );

  app.post(
    '/deactivate_promo',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.deactivateAuthPromo,
  );

  app.post(
    '/edit_auth_promotion',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.editAuthPromotion,
  );

  // edit APi pending

  /* 
  Coupons
  */

  app.post(
    '/insert_coupon',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.insertCoupon,
  );

  app.post(
    '/edit_coupon',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    PromotionsController.editCoupon,
  );
};
