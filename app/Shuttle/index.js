const shuttleRoute = require('./controllers/shuttleRoute');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.post(
    '/internal/insert_route',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.insertRoute,
  );
};
