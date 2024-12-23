const loginController = require('./controllers/login');
const Middlewares = require('./middelware');

module.exports = function (app) {
  app.post('/fetch_operator_token', loginController.checkOperatorToken);
  app.get(
    '/v1/acl/operator/isloggedin',
    Middlewares.admin.domainToken,
    Middlewares.admin.isLoggedIn,
    loginController.loginUsingToken,
  );
  app.post('/v1/acl/operator/login', loginController.adminLogin);
  app.get(
    '/v1/acl/user/details_with_permissions',
    Middlewares.admin.domainToken,
    Middlewares.admin.isLoggedIn,
    loginController.getAdminDetails,
  );
  app.post(
    '/v1/acl/operator/add',
    Middlewares.admin.domainToken,
    Middlewares.admin.isLoggedIn,
    loginController.addAdmin,
  );
  app.post(
    '/v1/acl/permissions/update',
    Middlewares.admin.domainToken,
    Middlewares.admin.isLoggedIn,
    loginController.addAdmin,
  );
  app.post(
    '/v1/acl/user/suspend',
    Middlewares.admin.domainToken,
    Middlewares.admin.isLoggedIn,
    loginController.suspendAdmin,
  );
  app.post(
    '/get_page_with_permission',
    Middlewares.admin.domainToken,
    Middlewares.admin.isLoggedIn,
    loginController.getPageWithPermission,
  );
};
