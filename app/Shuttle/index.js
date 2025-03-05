const shuttleRoute = require('./controllers/shuttleRoute');
const AdminMiddlewares = require('../admin/middelware');

module.exports = function (app) {
  app.post(
    '/internal/insert_route',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.insertRoute,
  );
  app.get(
    '/internal/fetch_routes',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.fetchRouteList,
  );

  app.post(
    '/internal/edit_route',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.editRoute,
  );

  app.post(
    '/internal/delete_route',
    AdminMiddlewares.admin.domainToken,
    AdminMiddlewares.admin.isLoggedIn,
    shuttleRoute.deleteRoute,
  );
};
