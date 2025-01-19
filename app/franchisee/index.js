const FranchiseeController = require('./controllers/franchisee');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {

/**
 * Franchisee APIS
*/  
  app.post(
    '/create_franchisee_from_panel',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.createFranchiseeFromPanel,
  );
  app.post(
    '/update_franchisee',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.updateFranchisee,
  );

  app.post(
    '/delete_franchisee',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.deleteFranchisee,
  );

  app.get(
    '/list_franchisees',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.fetchAllFranchisees,
  );

  app.post(
    '/franchisee/sign_up',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.signupFranchisee,
  );

  app.post(
    '/franchisee/login',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.loginFranchisee,
  );

  app.post(
    '/franchisee/change_password',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.changePassword,
  );

  app.post(
    '/franchisee/reset_password',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    FranchiseeController.resetPassword,
  );
};
