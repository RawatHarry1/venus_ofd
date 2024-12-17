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
  app.get(
    '/v1/acl/operator/login',
    Middlewares.admin.domainToken,
    loginController.adminLogin,
  );
};
